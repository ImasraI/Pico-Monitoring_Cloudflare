export const DOCTOR_PERMISSIONS = ["patients.manage", "files.manage", "treatment.manage", "scans.review", "messages.send", "rewards.manage"] as const;
export type ManagedAccount = { id: string; email: string | null; username?: string | null; name: string; role: "admin" | "doctor" | "patient"; doctor_id: string | null; disabled?: number; auth_version?: number; permissions?: string[] };
type Context = {
  db: D1Database;
  passwordHash: (password: string, salt: string) => Promise<string>;
  token: () => string;
  issueSession: (request: Request, user: ManagedAccount) => Promise<Response>;
};
export class AdminError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const clean = (value: unknown, limit = 100) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export function doctorPermissions(value?: string | null) {
  if (value == null) return [...DOCTOR_PERMISSIONS];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? DOCTOR_PERMISSIONS.filter(key => parsed.includes(key)) : []; }
  catch { return []; }
}
const writePermissions: Record<string, string> = {
  invite: "patients.manage", "patient.create": "patients.manage", "patient.personal": "patients.manage",
  "patient.invite": "patients.manage",
  "patient.file.add": "files.manage", "patient.file.delete": "files.manage",
  "patient.profile": "treatment.manage", "note.create": "treatment.manage", "step.create": "treatment.manage",
  "plan.create": "treatment.manage", "plan.update": "treatment.manage", "plan.pause": "treatment.manage",
  "plan.delete": "treatment.manage",
  "scan.review": "scans.review", message: "messages.send",
  "rewards.rules": "rewards.manage", "rewards.correct": "rewards.manage", "rewards.preferences": "rewards.manage",
};
export function checkDoctorAccess(user: ManagedAccount, op: string) {
  const key = writePermissions[op];
  if (user.role === "doctor" && key && !user.permissions?.includes(key)) throw new AdminError("این دسترسی توسط ادمین برای حساب شما غیرفعال شده است.", 403);
}
function requireAdmin(user: ManagedAccount | null): asserts user is ManagedAccount {
  if (!user) throw new AdminError("لطفاً وارد حساب ادمین شوید", 401);
  if (user.role !== "admin") throw new AdminError("فقط ادمین به این بخش دسترسی دارد", 403);
}
function audit(db: D1Database, actor: string, subject: string, action: string, details: unknown) {
  return db.prepare("INSERT INTO admin_audit (id,actor_id,subject_id,action,details,created_at) VALUES (?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), actor, subject, action, JSON.stringify(details), Date.now());
}
function identity(body: Record<string, unknown>) {
  const name = clean(body.name), email = clean(body.email, 254).toLowerCase();
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AdminError("نام کامل و ایمیل معتبر را وارد کنید");
  return { name, email };
}
function password(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) throw new AdminError("رمز عبور باید بین ۱۲ تا ۱۲۸ نویسه باشد");
  return value;
}
function accessInput(body: Record<string, unknown>) {
  if (!Array.isArray(body.permissions) || body.permissions.some(key => typeof key !== "string" || !DOCTOR_PERMISSIONS.includes(key as typeof DOCTOR_PERMISSIONS[number]))) throw new AdminError("دسترسی‌های انتخاب‌شده معتبر نیستند");
  const permissions = [...new Set(body.permissions)] as string[];
  const patientLimit = body.patientLimit === null || body.patientLimit === "" || body.patientLimit === undefined ? null : Number(body.patientLimit);
  if (patientLimit !== null && (!Number.isInteger(patientLimit) || patientLimit < 0 || patientLimit > 10000)) throw new AdminError("سقف بیماران باید بین صفر تا ۱۰٬۰۰۰ باشد؛ برای نامحدود خالی بگذارید");
  if (typeof body.disabled !== "boolean") throw new AdminError("وضعیت حساب معتبر نیست");
  const phone = clean(body.phone, 30);
  if (phone && !/^[+۰-۹٠-٩0-9\s()-]{7,30}$/.test(phone)) throw new AdminError("شماره تماس معتبر نیست");
  return { permissions, patientLimit, disabled: body.disabled ? 1 : 0, clinic: clean(body.clinic, 150), phone };
}
export async function adminGet(db: D1Database, user: ManagedAccount | null, op: string, url: URL) {
  if (op === "admin.bootstrap.status") return response({ initialized: Boolean(await db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").first()) });
  requireAdmin(user);
  if (op === "admin.summary") {
    const summary = await db.prepare("SELECT (SELECT COUNT(*) FROM users WHERE role='doctor') AS doctors,(SELECT COUNT(*) FROM users WHERE role='doctor' AND disabled=0) AS active_doctors,(SELECT COUNT(*) FROM users WHERE role='doctor' AND disabled=1) AS suspended_doctors,(SELECT COUNT(*) FROM users WHERE role='patient') AS patients").first();
    return response({ summary, permissionKeys: DOCTOR_PERMISSIONS });
  }
  const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page")) || 1)) | 0;
  const pageSize = 20;
  if (op === "admin.doctors") {
    const search = clean(url.searchParams.get("q"), 100), status = url.searchParams.get("status") || "all";
    if (!["all", "active", "suspended"].includes(status)) throw new AdminError("فیلتر وضعیت معتبر نیست");
    const where = "u.role='doctor' AND (u.name LIKE ? OR u.email LIKE ? OR COALESCE(a.clinic,'') LIKE ?)" + (status === "all" ? "" : " AND u.disabled=" + (status === "active" ? "0" : "1"));
    const values = Array(3).fill("%" + search + "%");
    const count = await db.prepare("SELECT COUNT(*) AS total FROM users u LEFT JOIN doctor_access a ON a.doctor_id=u.id WHERE " + where).bind(...values).first<{total: number}>();
    const rows = await db.prepare("SELECT u.id,u.name,u.email,u.disabled,u.created_at,u.last_login_at,COALESCE(a.clinic,'') AS clinic,COALESCE(a.phone,'') AS phone,a.patient_limit,a.permissions AS access_json,(SELECT COUNT(*) FROM users p WHERE p.doctor_id=u.id AND p.role='patient') AS patient_count,(SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND s.expires_at>?) AS session_count FROM users u LEFT JOIN doctor_access a ON a.doctor_id=u.id WHERE " + where + " ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?")
      .bind(Date.now(), ...values, pageSize, (page - 1) * pageSize).all();
    const doctors = rows.results.map(row => { const { access_json, ...record } = row; return { ...record, permissions: doctorPermissions(access_json as string | null) }; });
    return response({ doctors, total: count?.total ?? 0, page, pageSize });
  }
  if (op === "admin.audit") {
    const rows = await db.prepare("SELECT a.id,a.action,a.details,a.created_at,u.name AS actor_name,s.name AS subject_name FROM admin_audit a JOIN users u ON u.id=a.actor_id LEFT JOIN users s ON s.id=a.subject_id ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?").bind(pageSize, (page - 1) * pageSize).all();
    const count = await db.prepare("SELECT COUNT(*) AS total FROM admin_audit").first<{total:number}>();
    return response({ audit: rows.results, total: count?.total ?? 0, page, pageSize });
  }
  throw new AdminError("درخواست پیدا نشد", 404);
}
export async function adminPost(ctx: Context, request: Request, user: ManagedAccount | null, op: string, body: Record<string, unknown>, setupSecret?: string) {
  const { db } = ctx;
  if (op === "admin.bootstrap") {
    if (await db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").first()) throw new AdminError("ادمین اولیه قبلاً ساخته شده است. با حساب ادمین وارد شوید.", 409);
    if (!setupSecret || setupSecret.length < 24) throw new AdminError("راه‌اندازی ادمین هنوز تنظیم نشده است؛ یک کلید راه‌اندازی طولانی در تنظیمات سرور ثبت کنید.", 503);
    const entered = typeof body.setupKey === "string" ? body.setupKey : "";
    // Compare digest bytes so the key itself is never persisted or returned.
    const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
    const expected = await digest(setupSecret), supplied = await digest(entered);
    let difference = 0; for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ supplied[i];
    if (difference) throw new AdminError("کلید راه‌اندازی ادمین معتبر نیست", 403);
    const { name, email } = identity(body), pass = password(body.password), id = crypto.randomUUID(), salt = ctx.token(), now = Date.now();
    try {
      await db.batch([
        db.prepare("INSERT INTO users (id,email,name,role,doctor_id,password_hash,password_salt,created_at,last_login_at) VALUES (?,?,?,'admin',NULL,?,?,?,?)").bind(id, email, name, await ctx.passwordHash(pass, salt), salt, now, now),
        db.prepare("INSERT INTO notification_settings (user_id,messages,scans,roadmap) VALUES (?,1,1,1)").bind(id),
        audit(db, id, id, "admin.bootstrap", { name, email }),
      ]);
    } catch (error) { if (String(error).includes("UNIQUE")) throw new AdminError("ادمین قبلاً ساخته شده یا این ایمیل در سامانه ثبت شده است", 409); throw error; }
    return ctx.issueSession(request, { id, email, name, role: "admin", doctor_id: null });
  }
  requireAdmin(user);
  if (op === "admin.doctor.create") {
    const { name, email } = identity(body), pass = password(body.password), access = accessInput(body), id = crypto.randomUUID(), salt = ctx.token(), now = Date.now();
    try {
      await db.batch([
        db.prepare("INSERT INTO users (id,email,name,role,doctor_id,password_hash,password_salt,created_at,disabled) VALUES (?,?,?,'doctor',NULL,?,?,?,?)").bind(id, email, name, await ctx.passwordHash(pass, salt), salt, now, access.disabled),
        db.prepare("INSERT INTO doctor_access (doctor_id,clinic,phone,permissions,patient_limit,updated_at) VALUES (?,?,?,?,?,?)").bind(id, access.clinic, access.phone, JSON.stringify(access.permissions), access.patientLimit, now),
        db.prepare("INSERT INTO notification_settings (user_id,messages,scans,roadmap) VALUES (?,1,1,1)").bind(id),
        audit(db, user.id, id, op, { name, email, ...access }),
      ]);
    } catch (error) { if (String(error).includes("UNIQUE")) throw new AdminError("این ایمیل قبلاً ثبت شده است", 409); throw error; }
    return response({ doctor: { id, name, email, ...access } }, 201);
  }
  if (op === "admin.password") {
    const current = typeof body.currentPassword === "string" ? body.currentPassword : "", next = password(body.password);
    const row = await db.prepare("SELECT password_hash,password_salt FROM users WHERE id=?").bind(user.id).first<{password_hash:string;password_salt:string}>();
    if (!row || current.length > 128 || await ctx.passwordHash(current, row.password_salt) !== row.password_hash) throw new AdminError("رمز عبور فعلی صحیح نیست", 403);
    const salt = ctx.token();
    await db.batch([
      db.prepare("UPDATE users SET password_hash=?,password_salt=?,auth_version=auth_version+1 WHERE id=?").bind(await ctx.passwordHash(next, salt), salt, user.id),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id),
      audit(db, user.id, user.id, op, {}),
    ]);
    return response({ ok: true, signInAgain: true });
  }
  const id = clean(body.doctorId, 80);
  const doctor = await db.prepare("SELECT id,name,email,disabled FROM users WHERE id=? AND role='doctor'").bind(id).first<{id:string;name:string;email:string;disabled:number}>();
  if (!doctor) throw new AdminError("حساب پزشک پیدا نشد", 404);
  if (op === "admin.doctor.update") {
    const { name, email } = identity(body), access = accessInput(body);
    const statements = [
      db.prepare("UPDATE users SET name=?,email=?,disabled=?,auth_version=auth_version+? WHERE id=? AND role='doctor'").bind(name, email, access.disabled, access.disabled, id),
      db.prepare("INSERT INTO doctor_access (doctor_id,clinic,phone,permissions,patient_limit,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(doctor_id) DO UPDATE SET clinic=excluded.clinic,phone=excluded.phone,permissions=excluded.permissions,patient_limit=excluded.patient_limit,updated_at=excluded.updated_at")
        .bind(id, access.clinic, access.phone, JSON.stringify(access.permissions), access.patientLimit, Date.now()),
      audit(db, user.id, id, op, { name, email, ...access }),
    ];
    if (access.disabled) statements.push(db.prepare("DELETE FROM sessions WHERE user_id=?").bind(id));
    try { await db.batch(statements); }
    catch (error) { if (String(error).includes("UNIQUE")) throw new AdminError("این ایمیل قبلاً ثبت شده است", 409); throw error; }
    return response({ ok: true });
  }
  if (op === "admin.doctor.reset-password") {
    const pass = password(body.password), salt = ctx.token();
    await db.batch([
      db.prepare("UPDATE users SET password_hash=?,password_salt=?,auth_version=auth_version+1 WHERE id=? AND role='doctor'").bind(await ctx.passwordHash(pass, salt), salt, id),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
      db.prepare("DELETE FROM auth_attempts WHERE key=?").bind(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("login:" + doctor.email)).then(b => Array.from(new Uint8Array(b), byte => byte.toString(16).padStart(2, "0")).join(""))),
      audit(db, user.id, id, op, {}),
    ]);
    return response({ ok: true });
  }
  if (op === "admin.doctor.revoke-sessions") {
    await db.batch([db.prepare("UPDATE users SET auth_version=auth_version+1 WHERE id=?").bind(id),db.prepare("DELETE FROM sessions WHERE user_id=?").bind(id), audit(db, user.id, id, op, {})]);
    return response({ ok: true });
  }
  throw new AdminError("درخواست پیدا نشد", 404);
}
