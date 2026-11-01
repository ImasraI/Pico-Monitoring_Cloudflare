import { phoneNumber } from "./mobile";
export const DOCTOR_PERMISSIONS = ["patients.manage", "files.manage", "treatment.manage", "scans.review", "messages.send", "rewards.manage"] as const;
export type ManagedAccount = { id: string; email: string | null; username?: string | null; name: string; role: "admin" | "doctor" | "patient"; doctor_id: string | null; disabled?: number; auth_version?: number; permissions?: string[] };
type Context = {
  db: D1Database;
  passwordHash: (password: string, salt: string) => Promise<string>;
  token: () => string;
  patientInput: (body: Record<string, unknown>, existing: Record<string, unknown>) => PatientEdit;
};
type PatientEdit = { name:string; phone:string; nationalId:string|null; birthDate:string|null; email:string|null; gender:string; address:string; emergencyPhone:string; healthHistory:string; allergies:string; medications:string; treatmentType:string; alignerCount:number|null; doctorNote:string; planNote:string; nextScanAt:number|null; nextVisitAt:number|null };
export class AdminError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const clean = (value: unknown, limit = 100) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const searchText = (value:unknown) => clean(value).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776)).replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632));
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export function doctorPermissions(value?: string | null) {
  if (value == null) return [...DOCTOR_PERMISSIONS];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? DOCTOR_PERMISSIONS.filter(key => parsed.includes(key)) : []; }
  catch { return []; }
}
const writePermissions: Record<string, string> = {
  invite: "patients.manage", "patient.create": "patients.manage", "patient.personal": "patients.manage",
  "patient.invite": "patients.manage", "patient.intake": "patients.manage",
  "patient.file.add": "files.manage", "patient.file.delete": "files.manage",
  "patient.profile": "treatment.manage", "note.create": "treatment.manage", "note.delete": "treatment.manage", "step.create": "treatment.manage",
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
const doctorColumns = "u.id,u.name,u.email,u.username,u.disabled,u.deleted_at,u.created_at,u.last_login_at,COALESCE(a.clinic,'') AS clinic,COALESCE(a.phone,'') AS phone,a.patient_limit,a.permissions AS access_json,(SELECT COUNT(*) FROM users p WHERE p.doctor_id=u.id AND p.role='patient' AND p.deleted_at IS NULL) AS patient_count,(SELECT COUNT(*) FROM users p WHERE p.doctor_id=u.id AND p.role='patient' AND p.deleted_at IS NOT NULL) AS deleted_patient_count";
function publicDoctor(row: Record<string, unknown>) { const {access_json,...record}=row;return {...record,permissions:doctorPermissions(access_json as string|null)}; }
async function getDoctor(db:D1Database,id:string) {
  const row=await db.prepare("SELECT "+doctorColumns+" FROM users u LEFT JOIN doctor_access a ON a.doctor_id=u.id WHERE u.id=? AND u.role='doctor'").bind(id).first<Record<string,unknown>>();
  if(!row)throw new AdminError("حساب پزشک پیدا نشد",404);return publicDoctor(row);
}
function calendarDay(value:unknown) { return value ? new Date(Number(value)+3.5*3600000).toISOString().slice(0,10) : ""; }
async function patientPost(ctx:Context,user:ManagedAccount,op:string,body:Record<string,unknown>) {
  const {db}=ctx,id=clean(body.patientId,80),doctorId=clean(body.doctorId,80);
  const patient=await db.prepare("SELECT u.id,u.name,u.email,u.username,u.doctor_id,u.deleted_at,u.deleted_group,u.auth_version,p.* FROM users u LEFT JOIN patient_profiles p ON p.user_id=u.id WHERE u.id=? AND u.doctor_id=? AND u.role='patient'").bind(id,doctorId).first<Record<string,unknown>>();
  if(!patient)throw new AdminError("بیمار این پزشک پیدا نشد",404);
  if(op==="admin.patient.update") {
    if(patient.deleted_at)throw new AdminError("ابتدا حساب بیمار را بازیابی کنید",409);
    const defaults={name:patient.name,email:patient.email,phone:patient.phone||patient.username||"",nationalId:patient.national_id||"",birthDate:patient.birth_date||"",gender:patient.gender||"",address:patient.address||"",emergencyPhone:patient.emergency_phone||"",healthHistory:patient.health_history||"",allergies:patient.allergies||"",medications:patient.medications||"",treatmentType:patient.treatment_type||"",alignerCount:patient.aligner_count??"",doctorNote:patient.doctor_note||"",planNote:patient.plan_note||"",nextScanAt:calendarDay(patient.next_scan_at),nextVisitAt:calendarDay(patient.next_visit_at)};
    let input:PatientEdit;try{input=ctx.patientInput({...defaults,...body},patient);}catch(error){throw new AdminError((error as Error).message);}
    const changedPhone=patient.username!==(input.phone||null),now=Date.now(),eventId=crypto.randomUUID();
    const statements=[
      db.prepare("UPDATE users SET name=?,email=?,username=?,auth_version=auth_version+? WHERE id=? AND role='patient' AND doctor_id=? AND deleted_at IS NULL AND auth_version=?").bind(input.name,input.email,input.phone||null,changedPhone?1:0,id,doctorId,patient.auth_version),
      db.prepare("INSERT INTO admin_audit (id,actor_id,subject_id,action,details,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1").bind(eventId,user.id,id,op,JSON.stringify({doctorId,fields:Object.keys(body).filter(key=>!['op','patientId','doctorId'].includes(key))}),now),
      db.prepare("INSERT INTO patient_profiles (user_id,activated_at) SELECT ?,? WHERE EXISTS (SELECT 1 FROM admin_audit WHERE id=?) ON CONFLICT(user_id) DO NOTHING").bind(id,now,eventId),
      db.prepare("UPDATE patient_profiles SET phone=?,national_id=?,birth_date=?,gender=?,address=?,emergency_phone=?,health_history=?,allergies=?,medications=?,treatment_type=?,aligner_count=?,doctor_note=?,plan_note=?,next_scan_at=?,next_visit_at=?,personal_completed_at=? WHERE user_id=? AND EXISTS (SELECT 1 FROM admin_audit WHERE id=?)").bind(input.phone,input.nationalId,input.birthDate,input.gender,input.address,input.emergencyPhone,input.healthHistory,input.allergies,input.medications,input.treatmentType,input.alignerCount,input.doctorNote,input.planNote,input.nextScanAt,input.nextVisitAt,now,id,eventId),
    ];
    if(changedPhone)statements.push(db.prepare("DELETE FROM sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM admin_audit WHERE id=?)").bind(id,eventId));
    try{const result=await db.batch(statements);if(!result[0].meta.changes)throw new AdminError("اطلاعات حساب تغییر کرده است؛ صفحه را تازه کنید",409);}
    catch(error){if(String(error).includes("UNIQUE"))throw new AdminError("این شماره موبایل یا ایمیل قبلاً ثبت شده است",409);throw error;}
    return response({ok:true});
  }
  if(!["admin.patient.delete","admin.patient.restore"].includes(op))throw new AdminError("درخواست پیدا نشد",404);
  return archiveAccount(db,user,op,id,"patient",patient);
}
async function archiveAccount(db:D1Database,user:ManagedAccount,op:string,id:string,role:"doctor"|"patient",existing:Record<string,unknown>) {
  const restoring=op.endsWith(".restore"),eventId=crypto.randomUUID(),now=Date.now();
  if(restoring?!existing.deleted_at:Boolean(existing.deleted_at))throw new AdminError(restoring?"حساب حذف نشده است":"حساب قبلاً حذف شده است",409);
  if(role==='patient'&&restoring){const doctor=await db.prepare("SELECT id FROM users WHERE id=? AND role='doctor' AND deleted_at IS NULL").bind(existing.doctor_id).first();if(!doctor)throw new AdminError("ابتدا پزشک این بیمار را بازیابی کنید",409);}
  const update=restoring
    ? db.prepare("UPDATE users SET disabled=COALESCE(deleted_disabled,0),deleted_at=NULL,deleted_by=NULL,deleted_disabled=NULL,deleted_group=NULL,auth_version=auth_version+1 WHERE id=? AND role=? AND deleted_at IS NOT NULL AND auth_version=?").bind(id,role,existing.auth_version)
    : db.prepare("UPDATE users SET deleted_disabled=disabled,disabled=1,deleted_at=?,deleted_by=?,deleted_group=?,auth_version=auth_version+1 WHERE id=? AND role=? AND deleted_at IS NULL AND auth_version=?").bind(now,user.id,eventId,id,role,existing.auth_version);
  // D1 batches are transactional. This conditional audit gates all follow-up
  // changes so a stale or concurrent request cannot delete or restore children.
  const statements=[update,db.prepare("INSERT INTO admin_audit (id,actor_id,subject_id,action,details,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1").bind(eventId,user.id,id,op,JSON.stringify({name:existing.name,doctorId:existing.doctor_id||id}),now)];
  if(role==='doctor') {
    statements.push(restoring
      ? db.prepare("UPDATE users SET disabled=COALESCE(deleted_disabled,0),deleted_at=NULL,deleted_by=NULL,deleted_disabled=NULL,deleted_group=NULL,auth_version=auth_version+1 WHERE doctor_id=? AND role='patient' AND deleted_at IS NOT NULL AND deleted_group=? AND EXISTS (SELECT 1 FROM admin_audit WHERE id=?)").bind(id,existing.deleted_group,eventId)
      : db.prepare("UPDATE users SET deleted_disabled=disabled,disabled=1,deleted_at=?,deleted_by=?,deleted_group=?,auth_version=auth_version+1 WHERE doctor_id=? AND role='patient' AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM admin_audit WHERE id=?)").bind(now,user.id,eventId,id,eventId));
  }
  statements.push(db.prepare("DELETE FROM sessions WHERE (user_id=? OR user_id IN (SELECT id FROM users WHERE doctor_id=? AND role='patient' AND deleted_group=?)) AND EXISTS (SELECT 1 FROM admin_audit WHERE id=?)").bind(id,role==='doctor'?id:'',restoring?existing.deleted_group:eventId,eventId));
  const result=await db.batch(statements);
  if(!result[0].meta.changes)throw new AdminError("وضعیت حساب تغییر کرده است؛ صفحه را تازه کنید",409);
  return response({ok:true,affectedPatients:role==='doctor'?result[2].meta.changes:0});
}
function identity(body: Record<string, unknown>) {
  const name = clean(body.name), email = clean(body.email, 254).toLowerCase();
  if (name.length < 2 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new AdminError("نام کامل و ایمیل معتبر را وارد کنید");
  let username: string;
  try { username = phoneNumber(clean(body.phone, 30), true); } catch (error) { throw new AdminError((error as Error).message); }
  return { name, email: email || null, username };
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
  let phone: string;
  try { phone = phoneNumber(clean(body.phone, 30), true); } catch (error) { throw new AdminError((error as Error).message); }
  return { permissions, patientLimit, disabled: body.disabled ? 1 : 0, clinic: clean(body.clinic, 150), phone };
}
export async function adminGet(db: D1Database, user: ManagedAccount | null, op: string, url: URL) {
  if (op === "admin.bootstrap.status") throw new AdminError("درخواست پیدا نشد", 404);
  requireAdmin(user);
  if (op === "admin.summary") {
    const summary = await db.prepare("SELECT (SELECT COUNT(*) FROM users WHERE role='doctor' AND deleted_at IS NULL) AS doctors,(SELECT COUNT(*) FROM users WHERE role='doctor' AND disabled=0 AND deleted_at IS NULL) AS active_doctors,(SELECT COUNT(*) FROM users WHERE role='doctor' AND disabled=1 AND deleted_at IS NULL) AS suspended_doctors,(SELECT COUNT(*) FROM users WHERE role='patient' AND deleted_at IS NULL) AS patients").first();
    return response({ summary, permissionKeys: DOCTOR_PERMISSIONS });
  }
  const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page")) || 1)) | 0;
  const pageSize = 20;
  if (op === "admin.doctors") {
    const search = searchText(url.searchParams.get("q")), status = url.searchParams.get("status") || "all";
    if (!["all", "active", "suspended", "deleted"].includes(status)) throw new AdminError("فیلتر وضعیت معتبر نیست");
    const where = "u.role='doctor' AND (u.name LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR COALESCE(a.clinic,'') LIKE ?) AND u.deleted_at IS "+(status==='deleted'?'NOT NULL':'NULL') + (["all","deleted"].includes(status) ? "" : " AND u.disabled=" + (status === "active" ? "0" : "1"));
    const values = Array(4).fill("%" + search + "%");
    const count = await db.prepare("SELECT COUNT(*) AS total FROM users u LEFT JOIN doctor_access a ON a.doctor_id=u.id WHERE " + where).bind(...values).first<{total: number}>();
    const rows = await db.prepare("SELECT "+doctorColumns+",(SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND s.expires_at>?) AS session_count FROM users u LEFT JOIN doctor_access a ON a.doctor_id=u.id WHERE " + where + " ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?")
      .bind(Date.now(), ...values, pageSize, (page - 1) * pageSize).all();
    const doctors = rows.results.map(publicDoctor);
    return response({ doctors, total: count?.total ?? 0, page, pageSize });
  }
  if(op==='admin.patients') {
    const doctorId=clean(url.searchParams.get('doctorId'),80),doctor=await getDoctor(db,doctorId),search=searchText(url.searchParams.get('q')),status=url.searchParams.get('status')||'active';
    if(!['active','deleted'].includes(status))throw new AdminError('فیلتر وضعیت معتبر نیست');
    const where="u.role='patient' AND u.doctor_id=? AND u.deleted_at IS "+(status==='deleted'?'NOT NULL':'NULL')+" AND (u.name LIKE ? OR COALESCE(u.username,p.phone,'') LIKE ? OR COALESCE(p.national_id,'') LIKE ?)";
    const values=[doctorId,...Array(3).fill('%'+search+'%')];
    const count=await db.prepare('SELECT COUNT(*) AS total FROM users u LEFT JOIN patient_profiles p ON p.user_id=u.id WHERE '+where).bind(...values).first<{total:number}>();
    const rows=await db.prepare("SELECT u.id,u.name,u.email,u.username,u.doctor_id,u.deleted_at,u.disabled,u.created_at,p.phone,p.national_id,p.birth_date,p.treatment_type,p.aligner_count,p.personal_completed_at,(SELECT COUNT(*) FROM patient_files f WHERE f.patient_id=u.id) AS file_count FROM users u LEFT JOIN patient_profiles p ON p.user_id=u.id WHERE "+where+" ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?").bind(...values,pageSize,(page-1)*pageSize).all();
    return response({doctor,patients:rows.results,total:count?.total??0,page,pageSize});
  }
  if(op==='admin.patient') {
    const patientId=clean(url.searchParams.get('patientId'),80),doctorId=clean(url.searchParams.get('doctorId'),80);
    const patient=await db.prepare("SELECT u.id,u.name,u.email,u.username,u.doctor_id,u.deleted_at,u.disabled,p.* FROM users u LEFT JOIN patient_profiles p ON p.user_id=u.id WHERE u.id=? AND u.doctor_id=? AND u.role='patient'").bind(patientId,doctorId).first();
    if(!patient)throw new AdminError('بیمار این پزشک پیدا نشد',404);return response({patient});
  }
  if (op === "admin.audit") {
    const rows = await db.prepare("SELECT a.id,a.action,a.details,a.created_at,u.name AS actor_name,s.name AS subject_name FROM admin_audit a JOIN users u ON u.id=a.actor_id LEFT JOIN users s ON s.id=a.subject_id ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?").bind(pageSize, (page - 1) * pageSize).all();
    const count = await db.prepare("SELECT COUNT(*) AS total FROM admin_audit").first<{total:number}>();
    return response({ audit: rows.results, total: count?.total ?? 0, page, pageSize });
  }
  throw new AdminError("درخواست پیدا نشد", 404);
}
export async function adminPost(ctx: Context, user: ManagedAccount | null, op: string, body: Record<string, unknown>) {
  const { db } = ctx;
  if (op === "admin.bootstrap") throw new AdminError("درخواست پیدا نشد", 404);
  requireAdmin(user);
  if(op.startsWith('admin.patient.'))return patientPost(ctx,user,op,body);
  if (op === "admin.doctor.create") {
    const { name, email, username } = identity(body), pass = password(body.password), access = accessInput(body), id = crypto.randomUUID(), salt = ctx.token(), now = Date.now();
    try {
      await db.batch([
        db.prepare("INSERT INTO users (id,email,username,name,role,doctor_id,password_hash,password_salt,created_at,disabled) VALUES (?,?,?,?,'doctor',NULL,?,?,?,?)").bind(id, email, username, name, await ctx.passwordHash(pass, salt), salt, now, access.disabled),
        db.prepare("INSERT INTO doctor_access (doctor_id,clinic,phone,permissions,patient_limit,updated_at) VALUES (?,?,?,?,?,?)").bind(id, access.clinic, access.phone, JSON.stringify(access.permissions), access.patientLimit, now),
        db.prepare("INSERT INTO notification_settings (user_id,messages,scans,roadmap) VALUES (?,1,1,1)").bind(id),
        audit(db, user.id, id, op, { name, email, username, ...access }),
      ]);
    } catch (error) { if (String(error).includes("UNIQUE")) throw new AdminError("این شماره موبایل یا ایمیل قبلاً ثبت شده است", 409); throw error; }
    return response({ doctor: { id, name, email, username, ...access } }, 201);
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
  const doctor = await db.prepare("SELECT id,name,email,username,disabled,deleted_at,deleted_group,auth_version FROM users WHERE id=? AND role='doctor'").bind(id).first<{id:string;name:string;email:string|null;username:string|null;disabled:number;deleted_at:number|null;deleted_group:string|null;auth_version:number}>();
  if (!doctor) throw new AdminError("حساب پزشک پیدا نشد", 404);
  if(op==='admin.doctor.delete'||op==='admin.doctor.restore')return archiveAccount(db,user,op,id,'doctor',doctor);
  if(doctor.deleted_at)throw new AdminError('ابتدا حساب پزشک را بازیابی کنید',409);
  if (op === "admin.doctor.update") {
    const { name, email, username } = identity(body), access = accessInput(body);
    const statements = [
      db.prepare("UPDATE users SET name=?,email=?,username=?,disabled=?,auth_version=auth_version+? WHERE id=? AND role='doctor'").bind(name, email, username, access.disabled, access.disabled || doctor.username !== username ? 1 : 0, id),
      db.prepare("INSERT INTO doctor_access (doctor_id,clinic,phone,permissions,patient_limit,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(doctor_id) DO UPDATE SET clinic=excluded.clinic,phone=excluded.phone,permissions=excluded.permissions,patient_limit=excluded.patient_limit,updated_at=excluded.updated_at")
        .bind(id, access.clinic, access.phone, JSON.stringify(access.permissions), access.patientLimit, Date.now()),
      audit(db, user.id, id, op, { name, email, username, ...access }),
    ];
    if (access.disabled || doctor.username !== username) statements.push(db.prepare("DELETE FROM sessions WHERE user_id=?").bind(id));
    try { await db.batch(statements); }
    catch (error) { if (String(error).includes("UNIQUE")) throw new AdminError("این شماره موبایل یا ایمیل قبلاً ثبت شده است", 409); throw error; }
    return response({ ok: true });
  }
  if (op === "admin.doctor.reset-password") {
    const pass = password(body.password), salt = ctx.token();
    const attemptKeys = await Promise.all([doctor.username, doctor.email].filter((identifier): identifier is string => Boolean(identifier)).map(async identifier => { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("login:" + identifier)); return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join(""); }));
    await db.batch([
      db.prepare("UPDATE users SET password_hash=?,password_salt=?,auth_version=auth_version+1 WHERE id=? AND role='doctor'").bind(await ctx.passwordHash(pass, salt), salt, id),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
      ...attemptKeys.map(key => db.prepare("DELETE FROM auth_attempts WHERE key=?").bind(key)),
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
