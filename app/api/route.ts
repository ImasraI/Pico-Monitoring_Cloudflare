import { env } from "cloudflare:workers";
import { RewardError, windowStart, getStep, ensureReady, score, awardBonuses, summary as rewardSummary, action as rewardAction } from "./rewards";

export const dynamic = "force-dynamic";
type Account = { id: string; email: string | null; username?: string | null; name: string; role: "doctor" | "patient"; doctor_id: string | null };
type DbRow = Record<string, unknown>;
const COOKIE = "danto_session";
const WEEK = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 100000;
const encoder = new TextEncoder();

function db(): D1Database { if (!env.DB) throw new Error("DB binding missing"); return env.DB; }
function bucket(): R2Bucket { if (!env.BUCKET) throw new Error("BUCKET binding missing"); return env.BUCKET; }
function json(data: unknown, status = 200, headers: HeadersInit = {}) { return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } }); }
function fail(message: string, status = 400) { return json({ error: message }, status); }
function sql<T = DbRow>(query: string, ...values: unknown[]) { return db().prepare(query).bind(...values).first<T>(); }
function all<T = DbRow>(query: string, ...values: unknown[]) { return db().prepare(query).bind(...values).all<T>().then(r => r.results); }
function exec(query: string, ...values: unknown[]) { return db().prepare(query).bind(...values).run(); }
function token() { const b = new Uint8Array(32); crypto.getRandomValues(b); return Array.from(b, x => x.toString(16).padStart(2, "0")).join(""); }
async function hash(value: string) { const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value)); return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join(""); }
async function passwordHash(password: string, salt: string) { const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]); const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: PASSWORD_ITERATIONS, hash: "SHA-256" }, key, 256); return Array.from(new Uint8Array(bits), x => x.toString(16).padStart(2, "0")).join(""); }
function equal(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
function normalizedEmail(v: unknown) { return typeof v === "string" ? v.trim().toLowerCase() : ""; }
function safeName(v: unknown) { return typeof v === "string" ? v.trim().slice(0, 100) : ""; }
function validEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254; }
function validPassword(v: unknown): v is string { return typeof v === "string" && v.length >= 12 && v.length <= 128; }
function asciiDigits(value: string) { return value.replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632)); }
function field(form: FormData, key: string, limit = 1000) { const value = form.get(key); return typeof value === "string" ? value.trim().slice(0, limit) : ""; }
function isoDate(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value + "T12:00:00Z")) || new Date(value + "T12:00:00Z").toISOString().slice(0,10) !== value) throw new Error("تاریخ واردشده معتبر نیست");
  return value;
}
function dateAt(value: string) { const iso = isoDate(value); return iso ? new Date(iso + "T23:59:59+03:30").getTime() : null; }
function birthDate(value: string, required = false) { const iso = isoDate(value); if ((required && !iso) || (iso && (iso < "1900-01-01" || iso > new Date().toISOString().slice(0,10)))) throw new Error("تاریخ تولد معتبر نیست"); return iso; }
function phoneNumber(value: string, required = false) { let phone = asciiDigits(value).replace(/[\s()-]/g, ""); if (phone.startsWith("+98")) phone = "0" + phone.slice(3); else if (phone.startsWith("0098")) phone = "0" + phone.slice(4); else if (/^9\d{9}$/.test(phone)) phone = "0" + phone; if ((required && !phone) || (phone && !/^09\d{9}$/.test(phone))) throw new Error("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود"); return phone; }
function nationalId(value: string, required = false) { const id = asciiDigits(value).replace(/\s/g, ""); if ((required && !id) || (id && !/^\d{10}$/.test(id))) throw new Error("کد ملی باید ۱۰ رقم باشد؛ صفر ابتدای آن را وارد کنید"); return id || null; }
function profileInput(form: FormData) {
  const treatmentType = field(form, "treatmentType", 20), alignerCount = Number(asciiDigits(field(form, "alignerCount", 3)) || 0);
  if (!["", "aligner", "bracket"].includes(treatmentType)) throw new Error("نوع درمان معتبر نیست");
  if (treatmentType === "aligner" && (!Number.isInteger(alignerCount) || alignerCount < 1 || alignerCount > 120)) throw new Error("تعداد الاینر باید بین ۱ تا ۱۲۰ باشد");
  return { treatmentType, alignerCount: treatmentType === "aligner" ? alignerCount : null, doctorNote: field(form, "doctorNote", 2000), planNote: field(form, "planNote", 2000), nextScanAt: dateAt(field(form, "nextScanAt", 10)), nextVisitAt: dateAt(field(form, "nextVisitAt", 10)) };
}
function personalInput(body: Record<string, unknown>) {
  const str=(key: string, limit=2000)=> typeof body[key] === "string" ? (body[key] as string).trim().slice(0,limit) : "";
  const gender=str("gender",10), email=normalizedEmail(body.email);
  if (gender && !["female","male"].includes(gender)) throw new Error("جنسیت معتبر نیست");
  if (email && !validEmail(email)) throw new Error("ایمیل معتبر نیست");
  return { gender, email: email || null, address:str("address",500), emergencyPhone:phoneNumber(str("emergencyPhone",30)), healthHistory:str("healthHistory"), allergies:str("allergies"), medications:str("medications") };
}
const PERSONAL_COLUMNS = "birth_date,phone,national_id,gender,address,emergency_phone,health_history,allergies,medications,personal_completed_at,treatment_type,aligner_count,next_scan_at,next_visit_at,activated_at";
const FILE_TYPES: Record<string, string[]> = { oral: ["jpg","jpeg","png","webp"], face: ["jpg","jpeg","png","webp"], opg: ["jpg","jpeg","png","webp","pdf","dcm"], cbct: ["jpg","jpeg","png","webp","pdf","dcm","zip"], faceScan: ["jpg","jpeg","png","webp","obj","ply","stl","zip"], dentalScan: ["obj","ply","stl","dcm","zip"], planPdf: ["pdf"], planImages: ["jpg","jpeg","png","webp"], planOther: ["jpg","jpeg","png","webp","pdf","dcm","zip","obj","ply","stl"] };
async function validatePatientFile(file: File, category: string) { const extension = file.name.split(".").at(-1)?.toLowerCase() ?? ""; if (!FILE_TYPES[category]?.includes(extension) || file.size < 100 || file.size > 10_000_000) throw new Error("نوع یا حجم یکی از فایل‌ها مجاز نیست؛ هر فایل باید حداکثر ۱۰ مگابایت باشد"); const header = new Uint8Array(await file.slice(0, 132).arrayBuffer()); const image = ["jpg","jpeg","png","webp"].includes(extension); if (image) { const valid = ["jpg","jpeg"].includes(extension) ? header[0] === 255 && header[1] === 216 && file.type === "image/jpeg" : extension === "png" ? header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71 && file.type === "image/png" : header[0] === 82 && header[1] === 73 && header[2] === 70 && header[3] === 70 && header[8] === 87 && header[9] === 69 && file.type === "image/webp"; if (!valid) throw new Error("محتوای یکی از تصاویر معتبر نیست"); } if (extension === "pdf" && (String.fromCharCode(...header.slice(0, 4)) !== "%PDF")) throw new Error("فایل PDF معتبر نیست"); if (extension === "zip" && !(header[0] === 80 && header[1] === 75)) throw new Error("فایل فشرده معتبر نیست"); return image ? file.type : extension === "pdf" ? "application/pdf" : "application/octet-stream"; }
async function collectPatientFiles(form: FormData) { const items: Array<{ category: string; file: File; mime: string }> = []; for (const category of Object.keys(FILE_TYPES)) for (const value of form.getAll(`file:${category}`)) { if (!(value instanceof File) || !value.name) continue; items.push({ category, file: value, mime: await validatePatientFile(value, category) }); } if (items.length > 12 || items.reduce((sum, item) => sum + item.file.size, 0) > 30_000_000) throw new Error("حداکثر ۱۲ فایل و ۳۰ مگابایت در هر بار مجاز است"); return items; }
function cookie(request: Request, value: string, maxAge: number) { const secure = new URL(request.url).protocol === "https:" ? "; Secure" : ""; return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`; }
async function currentUser(request: Request): Promise<Account | null> { const raw = request.headers.get("cookie")?.match(/(?:^|;\s*)danto_session=([a-f0-9]{64})(?:;|$)/)?.[1]; if (!raw) return null; const row = await sql<Account>("SELECT u.id,u.email,u.username,u.name,u.role,u.doctor_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?", await hash(raw), Date.now()); return row ?? null; }
async function issueSession(request: Request, user: Account) { const raw = token(); const now = Date.now(); await exec("INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)", await hash(raw), user.id, now + WEEK, now); return json({ user: publicUser(user) }, 200, { "Set-Cookie": cookie(request, raw, WEEK / 1000) }); }
async function requirePatient(user: Account, id: string) { if (user.role === "patient" && user.id === id) return user; if (user.role === "doctor") return (await sql<Account>("SELECT id,email,username,name,role,doctor_id FROM users WHERE id=? AND doctor_id=? AND role='patient'", id, user.id)) ?? null; return null; }
async function notification(userId: string, kind: "messages" | "scans" | "roadmap", title: string, body: string) { const settings = await sql<{ enabled: number }>(`SELECT ${kind} AS enabled FROM notification_settings WHERE user_id=?`, userId); if (settings && !settings.enabled) return; await exec("INSERT INTO notifications (id,user_id,kind,title,body,created_at,read_at) VALUES (?,?,?,?,?,?,NULL)", crypto.randomUUID(), userId, kind, title, body, Date.now()); }
function ownOrigin(request: Request) { const origin = request.headers.get("origin"); return !origin || origin === new URL(request.url).origin; }
function publicUser(row: Account) { return { id: row.id, email: row.email, username: row.username ?? null, name: row.name, role: row.role, doctorId: row.doctor_id }; }
async function bodyJson(request: Request) { const length = Number(request.headers.get("content-length") || 0); if (length > 128000) throw new Error("درخواست بیش از حد بزرگ است"); return await request.json() as Record<string, unknown>; }

type PlanEvent = { title: string; detail: string; dueAt: number; opensAt: number; rewardPoints: number | null; eventType: string; alignerNo: number | null; seriesId: string | null };
function planInput(value: unknown, profile: { treatment_type?: string; aligner_count?: number | null }) {
  if (!Array.isArray(value) || value.length > 120) throw new Error("حداکثر ۱۲۰ رویداد در هر برنامه مجاز است");
  const aligners = new Set<number>();
  return value.map((raw): PlanEvent => {
    const item = raw as Record<string, unknown>, title = safeName(item?.title), detail = typeof item?.detail === "string" ? item.detail.trim().slice(0, 500) : "", dueAt = Number(item?.dueAt), eventType = String(item?.eventType ?? "custom"), alignerNo = eventType === "aligner" ? Number(item?.alignerNo) : null;
    if (title.length < 2 || !Number.isFinite(dueAt) || dueAt < Date.now() - 86400000 || dueAt > Date.now() + 10 * 365 * 86400000 || !["scan","visit","aligner","final","custom"].includes(eventType)) throw new Error("عنوان، نوع یا تاریخ یکی از رویدادها معتبر نیست");
    if (eventType === "aligner" && (profile.treatment_type !== "aligner" || !Number.isInteger(alignerNo) || alignerNo! < 1 || alignerNo! > (profile.aligner_count || 0) || aligners.has(alignerNo!))) throw new Error("شماره الاینر باید یکتا و در محدوده طرح درمان باشد");
    if (alignerNo) aligners.add(alignerNo);
    const opensAt = item.opensAt == null ? windowStart(dueAt) : Number(item.opensAt), rewardPoints = item.rewardPoints == null || item.rewardPoints === "" ? null : Number(item.rewardPoints);
    if (!Number.isFinite(opensAt) || opensAt < 0 || opensAt > dueAt || (rewardPoints !== null && (!Number.isInteger(rewardPoints) || rewardPoints<0 || rewardPoints>500))) throw new Error("بازه مجاز یا امتیاز مرحله معتبر نیست");
    return { title, detail, dueAt, opensAt, rewardPoints, eventType, alignerNo, seriesId: typeof item.seriesId === "string" && /^[a-zA-Z0-9-]{1,60}$/.test(item.seriesId) ? item.seriesId : null };
  });
}

export async function GET(request: Request) { try {
  const url = new URL(request.url); const op = url.searchParams.get("op");
  const user = await currentUser(request); if (!user) return fail("لطفاً وارد حساب شوید", 401);
  if (op === "me") return json({ user: publicUser(user) });
  if (op === "patients") { if (user.role !== "doctor") return fail("دسترسی مجاز نیست", 403); const patients = await all("SELECT u.id,u.name,u.email,u.username,u.created_at,p.phone,p.personal_completed_at,p.activated_at,p.treatment_type,p.aligner_count,p.next_scan_at,p.next_visit_at,(SELECT f.id FROM patient_files f WHERE f.patient_id=u.id AND f.category='face' AND f.mime LIKE 'image/%' ORDER BY f.created_at DESC LIMIT 1) AS face_file_id,(SELECT f.id FROM patient_files f WHERE f.patient_id=u.id AND f.category='oral' AND f.mime LIKE 'image/%' ORDER BY f.created_at DESC LIMIT 1) AS oral_file_id FROM users u LEFT JOIN patient_profiles p ON p.user_id=u.id WHERE u.role='patient' AND u.doctor_id=? ORDER BY u.created_at DESC", user.id); return json({ patients }); }
  if (op === "notifications") { const rows = await all("SELECT id,kind,title,body,created_at,read_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50", user.id); return json({ notifications: rows }); }
  if (op === "settings") { const row = await sql("SELECT messages,scans,roadmap FROM notification_settings WHERE user_id=?", user.id); return json({ settings: row ?? { messages: 1, scans: 1, roadmap: 1 } }); }
  if (op === "image") { const imageId = url.searchParams.get("imageId") ?? ""; const img = await sql<{ object_key: string; mime: string }>("SELECT i.object_key,i.mime FROM scan_images i JOIN users p ON p.id=i.patient_id WHERE i.id=? AND (i.patient_id=? OR p.doctor_id=?)", imageId, user.id, user.id); if (!img) return fail("تصویر پیدا نشد", 404); const obj = await bucket().get(img.object_key); if (!obj) return fail("فایل در دسترس نیست", 404); return new Response(obj.body, { headers: { "Content-Type": img.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); }
  if (op === "patient.file") { const fileId = url.searchParams.get("fileId") ?? ""; const file = await sql<{ object_key: string; mime: string; name: string }>("SELECT f.object_key,f.mime,f.name FROM patient_files f JOIN users p ON p.id=f.patient_id WHERE f.id=? AND ((p.doctor_id=? AND f.doctor_id=?) OR (f.patient_id=? AND f.category IN ('oral','face','opg','cbct','faceScan','dentalScan')))", fileId, user.id, user.id, user.id); if (!file) return fail("فایل پیدا نشد", 404); const obj = await bucket().get(file.object_key); if (!obj) return fail("فایل در دسترس نیست", 404); const safeName = file.name.replace(/[\r\n"\\]/g, "_"); return new Response(obj.body, { headers: { "Content-Type": file.mime, "Content-Disposition": `${file.mime.startsWith("image/") || file.mime === "application/pdf" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(safeName)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); }
  const patientId = url.searchParams.get("patientId") ?? ""; const patient = await requirePatient(user, patientId); if (!patient) return fail("پرونده پیدا نشد", 404);
  if (op === "patient") return json({ patient: publicUser(patient) });
  if (op === "patient.schedule") { const schedule = await sql("SELECT treatment_type,aligner_count,next_scan_at,next_visit_at FROM patient_profiles WHERE user_id=?", patientId); return json({ schedule }); }
  if (op === "patient.record" || op === "patient.personal") {
    if (op === "patient.record" && user.role !== "doctor") return fail("دسترسی مجاز نیست", 403);
    const profile = await sql("SELECT " + PERSONAL_COLUMNS + (user.role === "doctor" ? ",doctor_note,plan_note" : "") + " FROM patient_profiles WHERE user_id=?", patientId);
    const files = await all("SELECT id,category,name,size,mime,description,created_at,uploaded_by FROM patient_files WHERE patient_id=?" + (user.role === "patient" ? " AND category IN ('oral','face','opg','cbct','faceScan','dentalScan')" : "") + " ORDER BY created_at DESC", patientId);
    return json({ profile, files });
  }
  if (op === "messages") { const rows = await all("SELECT id,sender_id,kind,body,created_at,read_at FROM messages WHERE patient_id=? ORDER BY created_at ASC LIMIT 200", patientId); return json({ messages: rows }); }
  if (op === "notes") { if (user.role !== "doctor") return fail("دسترسی مجاز نیست", 403); return json({ notes: await all("SELECT id,body,created_at FROM patient_notes WHERE patient_id=? AND doctor_id=? ORDER BY created_at DESC", patientId, user.id) }); }
  if (op === "rewards") return json(await rewardSummary(db(),patientId));
  if (op === "steps") { const rows = await all("SELECT id,title,detail,due_at,completed_at,points_awarded,position,event_type,series_id,aligner_no,opens_at,paused_at,first_attempt_at,reward_points,on_time FROM steps WHERE patient_id=? ORDER BY due_at,position,id", patientId); return json({ steps: rows }); }
  if (op === "scans") { const rows = await all("SELECT s.id,s.created_at,s.status,s.doctor_note,s.step_id,s.review_result,i.id AS image_id,i.view FROM scans s LEFT JOIN scan_images i ON i.scan_id=s.id WHERE s.patient_id=? ORDER BY s.created_at DESC LIMIT 150", patientId); const groups = new Map<string, { id: string; created_at: number; status: string; doctor_note: string | null; step_id: string | null; review_result: string; images: Array<{ id: string; view: string }> }>(); for (const r of rows as DbRow[]) { const id = String(r.id); if (!groups.has(id)) groups.set(id, { id, created_at: Number(r.created_at), status: String(r.status), doctor_note: r.doctor_note ? String(r.doctor_note) : null, step_id:r.step_id?String(r.step_id):null, review_result:String(r.review_result), images: [] }); if (r.image_id) groups.get(id)!.images.push({ id: String(r.image_id), view: String(r.view) }); } return json({ scans: [...groups.values()] }); }
  return fail("درخواست ناشناخته است", 404);
} catch (error) { console.error("DANTO_GET", error); return fail("دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.", 500); } }

export async function POST(request: Request) { try {
  if (!ownOrigin(request)) return fail("منبع درخواست مجاز نیست", 403);
  const type = request.headers.get("content-type") ?? "";
  if (type.startsWith("multipart/form-data")) { if (Number(request.headers.get("content-length") || 0) > 32_000_000) return fail("حجم فایل‌ها بیش از حد مجاز است", 413); const form = await request.formData(); const op = form.get("op"); if (op === "patient.create") return await postPatient(request, form); if (op === "patient.file.add") return await postPatientFiles(request, form); return await postScan(request, form); }
  if (!type.startsWith("application/json")) return fail("فرمت درخواست معتبر نیست", 415);
  const body = await bodyJson(request); const op = body.op;
  if (op === "setup") { const setupKey = typeof body.setupKey === "string" ? body.setupKey : ""; if (!env.DANTO_SETUP_KEY || !equal(setupKey, env.DANTO_SETUP_KEY)) return fail("کد راه‌اندازی معتبر نیست", 403); const email = normalizedEmail(body.email), name = safeName(body.name); if (!validEmail(email) || name.length < 2 || !validPassword(body.password)) return fail("نام، ایمیل یا رمز عبور معتبر نیست. رمز باید حداقل ۱۲ نویسه باشد."); if (await sql("SELECT id FROM users WHERE email=?", email)) return fail("این ایمیل قبلاً ثبت شده است", 409); const id = crypto.randomUUID(), salt = token(), now = Date.now(); await exec("INSERT INTO users (id,email,name,role,doctor_id,password_hash,password_salt,created_at) VALUES (?,?,?,'doctor',NULL,?,?,?)", id, email, name, await passwordHash(body.password, salt), salt, now); await exec("INSERT INTO notification_settings (user_id,messages,scans,roadmap) VALUES (?,1,1,1)", id); return issueSession(request, { id, email, name, role: "doctor", doctor_id: null }); }
  if (op === "accept") { const code = typeof body.invite === "string" ? body.invite : ""; if (!/^[a-f0-9]{64}$/.test(code) || !validPassword(body.password)) return fail("دعوت‌نامه یا رمز عبور معتبر نیست"); const codeHash = await hash(code); const invite = await sql<{ doctor_id: string; email: string; patient_name: string }>("SELECT doctor_id,email,patient_name FROM invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?", codeHash, Date.now()); if (!invite) return fail("دعوت‌نامه منقضی یا استفاده شده است", 400); const existing = await sql<{ id: string; doctor_id: string }>("SELECT id,doctor_id FROM users WHERE email=?", invite.email); const salt = token(), now = Date.now(), password = await passwordHash(body.password, salt); let id: string; if (existing) { const profile = await sql<{ activated_at: number | null }>("SELECT activated_at FROM patient_profiles WHERE user_id=?", existing.id); if (existing.doctor_id !== invite.doctor_id || !profile || profile.activated_at) return fail("این ایمیل قبلاً ثبت شده است", 409); id = existing.id; await db().batch([db().prepare("UPDATE users SET password_hash=?,password_salt=? WHERE id=?").bind(password, salt, id), db().prepare("UPDATE patient_profiles SET activated_at=? WHERE user_id=? AND activated_at IS NULL").bind(now, id), db().prepare("UPDATE invites SET used_at=? WHERE token_hash=? AND used_at IS NULL").bind(now, codeHash)]); } else { id = crypto.randomUUID(); await db().batch([db().prepare("INSERT INTO users (id,email,name,role,doctor_id,password_hash,password_salt,created_at) VALUES (?,?,?,'patient',?,?,?,?)").bind(id, invite.email, invite.patient_name, invite.doctor_id, password, salt, now), db().prepare("UPDATE invites SET used_at=? WHERE token_hash=? AND used_at IS NULL").bind(now, codeHash), db().prepare("INSERT INTO notification_settings (user_id,messages,scans,roadmap) VALUES (?,1,1,1)").bind(id)]); } return issueSession(request, { id, email: invite.email, name: invite.patient_name, role: "patient", doctor_id: invite.doctor_id }); }
  if (op === "login") {
    const raw=String(body.identifier ?? body.email ?? "").trim(); let identifier=normalizedEmail(raw);
    if (!raw.includes("@")) { try { identifier=phoneNumber(raw,true); } catch { return fail("نام کاربری یا رمز عبور اشتباه است",401); } }
    const password=typeof body.password === "string" ? body.password : "";
    if ((!validEmail(identifier) && !/^09\d{9}$/.test(identifier)) || !password || password.length>128) return fail("نام کاربری یا رمز عبور اشتباه است",401);
    const key=await hash("login:"+identifier), attempt=await sql<{count:number;reset_at:number}>("SELECT count,reset_at FROM auth_attempts WHERE key=?",key);
    if (attempt && attempt.reset_at>Date.now() && attempt.count>=8) return fail("تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه دیگر دوباره امتحان کنید",429);
    const row=await sql<Account & {password_hash:string;password_salt:string}>("SELECT id,email,username,name,role,doctor_id,password_hash,password_salt FROM users WHERE " + (identifier.includes("@") ? "email=?" : "username=?"),identifier);
    const entered=row?.role === "patient" && /^\d{10}$/.test(asciiDigits(password)) ? asciiDigits(password) : password;
    const candidate=await passwordHash(entered,row?.password_salt ?? "fallback-fixed-salt"), profile=row?.role === "patient" ? await sql<{activated_at:number|null}>("SELECT activated_at FROM patient_profiles WHERE user_id=?",row.id) : null;
    if (!row || !equal(candidate,row.password_hash) || (profile && !profile.activated_at)) {
      const now=Date.now(); await exec("INSERT INTO auth_attempts (key,count,reset_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END",key,1,now+900000,now,now,now+900000);
      return fail("نام کاربری یا رمز عبور اشتباه است",401);
    }
    await exec("DELETE FROM auth_attempts WHERE key=?",key); return issueSession(request,row);
  }
  const user = await currentUser(request); if (!user) return fail("لطفاً وارد حساب شوید", 401);
  if (op === "logout") { const raw = request.headers.get("cookie")?.match(/(?:^|;\s*)danto_session=([a-f0-9]{64})(?:;|$)/)?.[1]; if (raw) await exec("DELETE FROM sessions WHERE token_hash=?", await hash(raw)); return json({ ok: true }, 200, { "Set-Cookie": cookie(request, "", 0) }); }
  if (op === "invite") { if (user.role !== "doctor") return fail("دسترسی مجاز نیست", 403); const email = normalizedEmail(body.email), name = safeName(body.name); if (!validEmail(email) || name.length < 2) return fail("نام و ایمیل بیمار را وارد کنید"); if (await sql("SELECT id FROM users WHERE email=?", email)) return fail("این ایمیل قبلاً ثبت شده است", 409); const raw = token(), now = Date.now(); await exec("INSERT INTO invites (token_hash,doctor_id,email,patient_name,expires_at,used_at) VALUES (?,?,?,?,?,NULL)", await hash(raw), user.id, email, name, now + WEEK); return json({ invite: raw, expiresAt: now + WEEK }, 201); }
  if (op === "settings") { const settings = body.settings as Record<string, unknown> | undefined; if (!settings || ["messages", "scans", "roadmap"].some(k => typeof settings[k] !== "boolean")) return fail("تنظیمات معتبر نیست"); await exec("UPDATE notification_settings SET messages=?,scans=?,roadmap=? WHERE user_id=?", settings.messages ? 1 : 0, settings.scans ? 1 : 0, settings.roadmap ? 1 : 0, user.id); return json({ ok: true }); }
  if (op === "notifications.read") { await exec("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL", Date.now(), user.id); return json({ ok: true }); }
  const patientId = typeof body.patientId === "string" ? body.patientId : ""; const patient = await requirePatient(user, patientId); if (!patient) return fail("پرونده پیدا نشد", 404);
  if (typeof op === "string" && op.startsWith("rewards.")) return json(await rewardAction(db(),op,body,patientId,patient.doctor_id!,user.role === "doctor"));
  if (op === "plan.pause") {
    if (user.role!=="doctor") return fail("دسترسی مجاز نیست",403);
    const step=await getStep(db(),patientId,String(body.stepId??"")); if(step.completed_at)return fail("مرحله تکمیل‌شده قابل توقف نیست",409);
    if(typeof body.paused!=="boolean")return fail("وضعیت توقف معتبر نیست");
    await exec("UPDATE steps SET paused_at=? WHERE id=? AND patient_id=? AND completed_at IS NULL",body.paused?Date.now():null,step.id,patientId);
    await notification(patientId,"roadmap",body.paused?"مرحله درمان متوقف شد":"مرحله درمان فعال شد",step.title);return json({ok:true});
  }
  if (op === "note.create") { if (user.role !== "doctor") return fail("دسترسی مجاز نیست", 403); const text = typeof body.text === "string" ? body.text.trim() : ""; if (!text || text.length > 2000) return fail("یادداشت باید بین ۱ تا ۲۰۰۰ نویسه باشد"); await exec("INSERT INTO patient_notes (id,patient_id,doctor_id,body,created_at) VALUES (?,?,?,?,?)", crypto.randomUUID(), patientId, user.id, text, Date.now()); return json({ ok: true }, 201); }
  if (op === "plan.create") {
    if (user.role !== "doctor") return fail("دسترسی مجاز نیست", 403);
    const profile = await sql<{ treatment_type: string; aligner_count: number }>("SELECT treatment_type,aligner_count FROM patient_profiles WHERE user_id=?", patientId);
    let events; try { events = planInput(body.events, profile ?? {}); } catch (error) { return fail((error as Error).message); }
    if (!events.length) return fail("رویدادی انتخاب نشده است");
    const used = await all<{ aligner_no: number }>("SELECT aligner_no FROM steps WHERE patient_id=? AND aligner_no IS NOT NULL", patientId);
    if (events.some(event => event.alignerNo && used.some(row => row.aligner_no === event.alignerNo))) return fail("این شماره الاینر قبلاً در برنامه ثبت شده است", 409);
    const current = await sql<{ position: number }>("SELECT COALESCE(MAX(position),0) AS position FROM steps WHERE patient_id=?", patientId), now = Date.now();
    await db().batch(events.map((event, index) => db().prepare("INSERT INTO steps (id,patient_id,doctor_id,title,detail,due_at,completed_at,points_awarded,position,created_at,event_type,series_id,aligner_no,opens_at,reward_points) VALUES (?,?,?,?,?,?,NULL,0,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), patientId, user.id, event.title, event.detail, event.dueAt, (current?.position ?? 0) + index + 1, now, event.eventType, event.seriesId, event.alignerNo,event.opensAt,event.rewardPoints)));
    await notification(patientId, "roadmap", "برنامه درمان به‌روز شد", `${events.length} مرحله به مسیر درمان اضافه شد`); return json({ ok: true }, 201);
  }
  if (op === "plan.update" || op === "plan.delete") {
    if (user.role !== "doctor") return fail("دسترسی مجاز نیست", 403);
    const id = String(body.stepId ?? ""), step = await sql<{ completed_at: number | null; series_id: string | null; first_attempt_at:number|null }>("SELECT completed_at,series_id,first_attempt_at FROM steps WHERE id=? AND patient_id=? AND doctor_id=?", id, patientId, user.id);
    if (!step) return fail("رویداد پیدا نشد", 404); if (step.completed_at) return fail("مرحله انجام‌شده قابل تغییر یا حذف نیست", 409);
    if (step.first_attempt_at) return fail("زمان و امتیاز اسکن ارسال‌شده ثابت است؛ ابتدا آن را بررسی کنید",409);
    if (op === "plan.delete") { if (body.series === true && step.series_id) await exec("DELETE FROM steps WHERE patient_id=? AND doctor_id=? AND series_id=? AND completed_at IS NULL AND first_attempt_at IS NULL", patientId, user.id, step.series_id); else await exec("DELETE FROM steps WHERE id=? AND patient_id=? AND doctor_id=? AND completed_at IS NULL AND first_attempt_at IS NULL", id, patientId, user.id); }
    else { const title = safeName(body.title), detail = typeof body.detail === "string" ? body.detail.trim().slice(0,500) : "", dueAt = Number(body.dueAt), opensAt=body.opensAt==null?windowStart(dueAt):Number(body.opensAt), rewardPoints=body.rewardPoints==null||body.rewardPoints===""?null:Number(body.rewardPoints); if (title.length < 2 || !Number.isFinite(dueAt) || dueAt < 0 || dueAt > Date.now() + 10 * 365 * 86400000 || !Number.isFinite(opensAt)||opensAt<0||opensAt>dueAt || (rewardPoints!==null&&(!Number.isInteger(rewardPoints)||rewardPoints<0||rewardPoints>500))) return fail("عنوان، بازه یا امتیاز معتبر نیست"); await exec("UPDATE steps SET title=?,detail=?,due_at=?,opens_at=?,reward_points=? WHERE id=? AND patient_id=? AND doctor_id=? AND completed_at IS NULL AND first_attempt_at IS NULL", title, detail, dueAt, opensAt,rewardPoints,id, patientId, user.id); }
    await notification(patientId, "roadmap", "برنامه درمان به‌روز شد", "پزشک برنامه درمان شما را تغییر داد"); return json({ ok: true });
  }
  if (op === "patient.invite") { if (user.role !== "doctor") return fail("دسترسی مجاز نیست", 403); const profile = await sql<{ activated_at: number | null }>("SELECT activated_at FROM patient_profiles WHERE user_id=?", patientId); if (!profile || profile.activated_at) return fail("حساب بیمار قبلاً فعال شده است", 409); const raw = token(), now = Date.now(); await db().batch([db().prepare("UPDATE invites SET used_at=? WHERE doctor_id=? AND email=? AND used_at IS NULL").bind(now, user.id, patient.email), db().prepare("INSERT INTO invites (token_hash,doctor_id,email,patient_name,expires_at,used_at) VALUES (?,?,?,?,?,NULL)").bind(await hash(raw), user.id, patient.email, patient.name, now + WEEK)]); return json({ invite: raw, expiresAt: now + WEEK }); }
  if (op === "patient.personal") {
    const isDoctor=user.role === "doctor";
    if (!isDoctor && ["name","phone","nationalId","birthDate","treatmentType","alignerCount","doctorNote","planNote","nextScanAt","nextVisitAt"].some(key=>Object.hasOwn(body,key))) return fail("مشخصات اولیه و اطلاعات درمان را پزشک ویرایش می‌کند",403);
    let personal, identity; const existing=await sql<{phone:string;national_id:string|null;birth_date:string|null}>("SELECT phone,national_id,birth_date FROM patient_profiles WHERE user_id=?",patientId);
    try { personal=personalInput(body); if(isDoctor) { const name=safeName(body.name); if(name.length<2)throw new Error("نام بیمار معتبر نیست"); identity={name,phone:phoneNumber(String(body.phone??""),Boolean(patient.username)),nationalId:nationalId(String(body.nationalId??""),Boolean(existing?.national_id)),birthDate:birthDate(String(body.birthDate??""),Boolean(existing?.birth_date))}; } } catch(error) { return fail((error as Error).message); }
    if(personal.email && await sql("SELECT id FROM users WHERE email=? AND id<>?",personal.email,patientId))return fail("این ایمیل قبلاً ثبت شده است",409);
    if(identity?.phone && await sql("SELECT u.id FROM users u LEFT JOIN patient_profiles p ON p.user_id=u.id WHERE (u.username=? OR p.phone=?) AND u.id<>?",identity.phone,identity.phone,patientId))return fail("این شماره تلفن قبلاً ثبت شده است",409);
    const statements=[db().prepare("INSERT INTO patient_profiles (user_id,activated_at) VALUES (?,?) ON CONFLICT(user_id) DO NOTHING").bind(patientId,Date.now()),db().prepare("UPDATE patient_profiles SET gender=?,address=?,emergency_phone=?,health_history=?,allergies=?,medications=?,personal_completed_at=? WHERE user_id=?").bind(personal.gender,personal.address,personal.emergencyPhone,personal.healthHistory,personal.allergies,personal.medications,Date.now(),patientId),db().prepare("UPDATE users SET email=? WHERE id=?").bind(personal.email,patientId)];
    if(identity){statements.push(db().prepare("UPDATE users SET name=?,username=? WHERE id=?").bind(identity.name,identity.phone||null,patientId),db().prepare("UPDATE patient_profiles SET phone=?,national_id=?,birth_date=? WHERE user_id=?").bind(identity.phone,identity.nationalId,identity.birthDate,patientId));}
    await db().batch(statements);return json({ok:true});
  }
  if (op === "patient.profile") {
    if (user.role !== "doctor") return fail("دسترسی مجاز نیست",403);
    const form=new FormData();for(const key of ["treatmentType","alignerCount","doctorNote","planNote","nextScanAt","nextVisitAt"])form.set(key,String(body[key]??""));
    let profile;try{profile=profileInput(form);}catch(error){return fail((error as Error).message);}
    await db().batch([db().prepare("INSERT INTO patient_profiles (user_id,activated_at) VALUES (?,?) ON CONFLICT(user_id) DO NOTHING").bind(patientId,Date.now()),db().prepare("UPDATE patient_profiles SET treatment_type=?,aligner_count=?,doctor_note=?,plan_note=?,next_scan_at=?,next_visit_at=? WHERE user_id=?").bind(profile.treatmentType,profile.alignerCount,profile.doctorNote,profile.planNote,profile.nextScanAt,profile.nextVisitAt,patientId)]); return json({ok:true});
  }
  if (op === "patient.file.delete") {
    const fileId=String(body.fileId??""),file=await sql<{object_key:string;uploaded_by:string|null}>("SELECT object_key,uploaded_by FROM patient_files WHERE id=? AND patient_id=?",fileId,patientId);
    if(!file)return fail("فایل پیدا نشد",404);if(user.role === "patient" && file.uploaded_by!==user.id)return fail("فقط فایل‌های بارگذاری‌شده توسط خودتان قابل حذف هستند",403);
    await exec("DELETE FROM patient_files WHERE id=? AND patient_id=?",fileId,patientId);await bucket().delete(file.object_key).catch(error=>console.warn("PATIENT_FILE_DELETE",error));return json({ok:true});
  }
  if (op === "messages.read") { await exec("UPDATE messages SET read_at=? WHERE patient_id=? AND sender_id<>? AND read_at IS NULL", Date.now(), patientId, user.id); return json({ ok: true }); }
  if (op === "message") { const text = typeof body.text === "string" ? body.text.trim() : ""; const kind = body.kind === "urgent" ? "urgent" : "normal"; if (!text || text.length > 2000) return fail("متن پیام باید بین ۱ تا ۲۰۰۰ نویسه باشد"); const id = crypto.randomUUID(), now = Date.now(); await exec("INSERT INTO messages (id,doctor_id,patient_id,sender_id,kind,body,created_at,read_at) VALUES (?,?,?,?,?,?,?,NULL)", id, patient.doctor_id ?? user.id, patientId, user.id, kind, text, now); const recipient = user.role === "doctor" ? patientId : patient.doctor_id!; await notification(recipient, "messages", kind === "urgent" ? "پیام فوری" : "پیام جدید", `${user.name}: ${text.slice(0, 90)}`); return json({ message: { id, sender_id: user.id, kind, body: text, created_at: now } }, 201); }
  if (op === "step.create") { if (user.role !== "doctor") return fail("دسترسی مجاز نیست", 403); const title = safeName(body.title), detail = typeof body.detail === "string" ? body.detail.trim().slice(0, 500) : "", dueAt = Number(body.dueAt); if (title.length < 2 || !Number.isFinite(dueAt) || dueAt < Date.now() - 86400000) return fail("عنوان یا موعد مرحله معتبر نیست"); const current = await sql<{ position: number }>("SELECT COALESCE(MAX(position),0) AS position FROM steps WHERE patient_id=?", patientId); const id = crypto.randomUUID(), now = Date.now(); await exec("INSERT INTO steps (id,patient_id,doctor_id,title,detail,due_at,completed_at,points_awarded,position,created_at) VALUES (?,?,?,?,?,?,NULL,0,?,?)", id, patientId, user.id, title, detail, dueAt, (current?.position ?? 0) + 1, now); await notification(patientId, "roadmap", "مرحله جدید درمان", title); return json({ step: { id, title, detail, due_at: dueAt, completed_at: null, points_awarded: 0, position: (current?.position ?? 0) + 1 } }, 201); }
  if (op === "step.complete") {
    if(user.role!=="patient")return fail("این مرحله را بیمار ثبت می‌کند",403);
    const step=await getStep(db(),patientId,String(body.stepId??"")),now=Date.now();
    if(step.event_type==="scan")return fail("برای مرحله اسکن باید تصویر ارسال شود و پزشک آن را تأیید کند",409);
    await ensureReady(db(),patientId,step,now);
    const award=step.event_type==="aligner"?await score(db(),patientId,step,now):{points:0,timely:false};
    const result=await exec("UPDATE steps SET completed_at=?,points_awarded=?,on_time=? WHERE id=? AND patient_id=? AND completed_at IS NULL AND paused_at IS NULL AND COALESCE(opens_at,?)<=? AND (event_type<>'aligner' OR NOT EXISTS (SELECT 1 FROM steps p WHERE p.patient_id=? AND p.event_type='aligner' AND p.completed_at IS NULL AND p.paused_at IS NULL AND (p.due_at<steps.due_at OR (p.due_at=steps.due_at AND p.position<steps.position))))",now,award.points,step.event_type==="aligner"?(award.timely?1:0):null,step.id,patientId,windowStart(step.due_at),now,patientId);
    if(!result.meta.changes)return fail("مرحله قابل ثبت نیست یا قبلاً ثبت شده است",409);
    await awardBonuses(db(),patientId,patient.doctor_id!);await notification(patient.doctor_id!,"roadmap","مرحله درمان انجام شد",`${user.name}: ${step.title} (گزارش بیمار)`);return json({completedAt:now,points:award.points});
  }
  if (op === "scan.review") {
    if(user.role!=="doctor")return fail("دسترسی مجاز نیست",403);
    const scanId=String(body.scanId??""),note=typeof body.note==="string"?body.note.trim().slice(0,1000):"",decision=String(body.decision??"accepted");
    if(!["accepted","recapture"].includes(decision)||decision==="recapture"&&!note)return fail("برای درخواست عکس مجدد دلیل بنویسید");
    const scan=await sql<{step_id:string|null;review_result:string;status:string}>("SELECT step_id,review_result,status FROM scans WHERE id=? AND patient_id=? AND doctor_id=?",scanId,patientId,user.id);
    if(!scan)return fail("اسکن پیدا نشد",404);if(scan.status==="reviewed")return fail("این اسکن قبلاً بررسی شده است",409);
    const step=scan.step_id?await getStep(db(),patientId,scan.step_id):null;
    if(step?.paused_at||step?.completed_at)return fail("مرحله مربوط به این اسکن فعال نیست",409);
    const statements=[db().prepare("UPDATE scans SET status='reviewed',review_result=?,doctor_note=? WHERE id=? AND patient_id=? AND status='new' AND (step_id IS NULL OR EXISTS (SELECT 1 FROM steps WHERE id=scans.step_id AND completed_at IS NULL AND paused_at IS NULL))").bind(decision,note,scanId,patientId)];
    if(step && decision==="accepted")statements.push(db().prepare("UPDATE steps SET completed_at=?,points_awarded=COALESCE(attempt_points,0) WHERE id=? AND patient_id=? AND completed_at IS NULL AND paused_at IS NULL AND EXISTS (SELECT 1 FROM scans WHERE id=? AND review_result='accepted')").bind(Date.now(),step.id,patientId,scanId));
    const result=await db().batch(statements);if(!result[0].meta.changes)return fail("اسکن قبلاً بررسی شده است",409);
    if(step&&decision==="accepted")await awardBonuses(db(),patientId,user.id);
    await notification(patientId,"scans",decision==="recapture"?"عکس مجدد لازم است":"اسکن تأیید شد",note||"پزشک تصاویر شما را تأیید کرد");return json({ok:true});
  }
  return fail("درخواست ناشناخته است", 404);
} catch (error) { if(error instanceof RewardError)return fail(error.message,error.status); console.error("DANTO_POST", error); return fail("ثبت اطلاعات ممکن نشد. دوباره تلاش کنید.", 500); } }

async function uploadPatientFiles(patientId: string, form: FormData) {
  const items = await collectPatientFiles(form);
  const saved: Array<{ id: string; category: string; name: string; size: number; mime: string; description: string; objectKey: string }> = [];
  try { for (const { category, file, mime } of items) { const id = crypto.randomUUID(), objectKey = `patient-records/${patientId}/${id}`; await bucket().put(objectKey, file.stream(), { httpMetadata: { contentType: mime } }); saved.push({ id, category, name: file.name.slice(0, 200), size: file.size, mime, description: field(form, `description:${category}`, 500), objectKey }); } return saved; }
  catch (error) { await Promise.allSettled(saved.map(item => bucket().delete(item.objectKey))); throw error; }
}
async function postPatient(request: Request, form: FormData) {
  const doctor=await currentUser(request);if(!doctor || doctor.role!=="doctor")return fail("فقط پزشک می‌تواند بیمار اضافه کند",403);
  const name=field(form,"name",100);let phone,idNumber,birth;
  try{if(name.length<2)throw new Error("نام کامل بیمار را وارد کنید");phone=phoneNumber(field(form,"phone",30),true);idNumber=nationalId(field(form,"nationalId",20),true)!;birth=birthDate(field(form,"birthDate",10),true);}catch(error){return fail((error as Error).message);}
  if(await sql("SELECT u.id FROM users u LEFT JOIN patient_profiles p ON p.user_id=u.id WHERE u.username=? OR p.phone=?",phone,phone))return fail("این شماره تلفن قبلاً ثبت شده است",409);
  const id=crypto.randomUUID(),salt=token(),now=Date.now();
  try{await db().batch([
    db().prepare("INSERT INTO users (id,email,username,name,role,doctor_id,password_hash,password_salt,created_at) VALUES (?,NULL,?,?,'patient',?,?,?,?)").bind(id,phone,name,doctor.id,await passwordHash(idNumber,salt),salt,now),
    db().prepare("INSERT INTO patient_profiles (user_id,birth_date,phone,national_id,activated_at) VALUES (?,?,?,?,?)").bind(id,birth,phone,idNumber,now),
    db().prepare("INSERT INTO notification_settings (user_id,messages,scans,roadmap) VALUES (?,1,1,1)").bind(id)
  ]);}catch(error){if(String(error).includes("UNIQUE"))return fail("این شماره تلفن قبلاً ثبت شده است",409);throw error;}
  return json({patient:{id,name,email:null,username:phone},active:true},201);
}
async function postPatientFiles(request: Request, form: FormData) {
  const user=await currentUser(request);if(!user)return fail("لطفاً وارد حساب شوید",401);
  const patientId=field(form,"patientId",100),patient=await requirePatient(user,patientId);if(!patient)return fail("پرونده پیدا نشد",404);
  if(user.role === "patient" && [...form.keys()].some(key=>key.startsWith("file:") && !["oral","face","opg","cbct","faceScan","dentalScan"].includes(key.slice(5))))return fail("ثبت فایل‌های طرح درمان فقط برای پزشک مجاز است",403);
  let uploaded: Awaited<ReturnType<typeof uploadPatientFiles>>=[];
  try{uploaded=await uploadPatientFiles(patientId,form);if(!uploaded.length)return fail("فایلی انتخاب نشده است");const now=Date.now();await db().batch(uploaded.map(file=>db().prepare("INSERT INTO patient_files (id,patient_id,doctor_id,category,name,size,mime,description,object_key,created_at,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(file.id,patientId,patient.doctor_id!,file.category,file.name,file.size,file.mime,file.description,file.objectKey,now,user.id)));return json({files:uploaded.map(file=>({id:file.id,category:file.category,name:file.name,size:file.size,mime:file.mime,description:file.description}))},201);}
  catch(error){await Promise.allSettled(uploaded.map(file=>bucket().delete(file.objectKey)));if(error instanceof Error && /مجاز|معتبر/.test(error.message))return fail(error.message);console.error("PATIENT_FILE_ADD",error);return fail("بارگذاری فایل انجام نشد؛ دوباره تلاش کنید",500);}
}

async function postScan(request: Request, form: FormData) { const user = await currentUser(request); if (!user || user.role !== "patient") return fail("فقط بیمار می‌تواند اسکن ارسال کند", 403); const length = Number(request.headers.get("content-length") || 0); if (length > 31_000_000) return fail("حجم تصاویر بیش از حد مجاز است", 413); if (form.get("op") !== "scan.create") return fail("درخواست نامعتبر است"); const views = ["front", "right", "left"] as const; const files = views.map(v => form.get(v)); if (files.every(v => !(v instanceof File))) return fail("حداقل یک تصویر لازم است"); const accepted = files.map((v, i) => ({ file: v, view: views[i] })).filter((x): x is { file: File; view: typeof views[number] } => x.file instanceof File); for (const { file } of accepted) { if (file.size < 100 || file.size > 10_000_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return fail("فقط عکس JPG، PNG یا WebP تا ۱۰ مگابایت مجاز است"); const header = new Uint8Array(await file.slice(0, 12).arrayBuffer()); const valid = file.type === "image/png" ? header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71 : file.type === "image/jpeg" ? header[0] === 255 && header[1] === 216 : header[0] === 82 && header[1] === 73 && header[2] === 70 && header[3] === 70 && header[8] === 87 && header[9] === 69; if (!valid) return fail("محتوای تصویر معتبر نیست"); }
  const stepId=field(form,"stepId",100),now=Date.now(),step=stepId?await getStep(db(),user.id,stepId):null;
  if(step){if(step.event_type!=="scan")return fail("مرحله انتخاب‌شده از نوع اسکن نیست");await ensureReady(db(),user.id,step,now);if(await sql("SELECT id FROM scans WHERE step_id=? AND patient_id=? AND status='new'",stepId,user.id))return fail("اسکن این مرحله در انتظار بررسی پزشک است",409);}
  const award=step?await score(db(),user.id,step,now):null;
  const scanId=crypto.randomUUID(),imageRows:Array<{id:string;key:string;mime:string;view:string}>=[];
  try {
    for(const {file,view} of accepted){const id=crypto.randomUUID(),key=`${user.id}/${scanId}/${id}`;await bucket().put(key,file.stream(),{httpMetadata:{contentType:file.type}});imageRows.push({id,key,mime:file.type,view});}
    const insert=step?db().prepare("INSERT INTO scans (id,patient_id,doctor_id,created_at,status,doctor_note,step_id,review_result) SELECT ?,?,?,?,'new',NULL,?,'pending' FROM steps WHERE id=? AND patient_id=? AND event_type='scan' AND completed_at IS NULL AND paused_at IS NULL AND COALESCE(opens_at,?)<=? AND NOT EXISTS (SELECT 1 FROM scans WHERE step_id=? AND status='new')").bind(scanId,user.id,user.doctor_id!,now,stepId,stepId,user.id,windowStart(step.due_at),now,stepId):db().prepare("INSERT INTO scans (id,patient_id,doctor_id,created_at,status,doctor_note,step_id,review_result) VALUES (?,?,?,?,'new',NULL,NULL,'pending')").bind(scanId,user.id,user.doctor_id!,now);
    const statements=[insert,...imageRows.map(r=>db().prepare("INSERT INTO scan_images (id,scan_id,patient_id,object_key,mime,view,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM scans WHERE id=?)").bind(r.id,scanId,user.id,r.key,r.mime,r.view,now,scanId))];
    if(step)statements.push(db().prepare("UPDATE steps SET first_attempt_at=?,attempt_points=?,on_time=? WHERE id=? AND patient_id=? AND first_attempt_at IS NULL AND EXISTS (SELECT 1 FROM scans WHERE id=?)").bind(now,award!.points,award!.timely?1:0,stepId,user.id,scanId));
    const result=await db().batch(statements);
    if(!result[0].meta.changes){await Promise.allSettled(imageRows.map(r=>bucket().delete(r.key)));return fail("اسکن مرحله قبلاً ارسال شده یا مرحله فعال نیست",409);}
  }catch(error){await Promise.allSettled(imageRows.map(r=>bucket().delete(r.key)));throw error;}
  await notification(user.doctor_id!,"scans","اسکن جدید",`${user.name} تصویر تازه ارسال کرد`);return json({scan:{id:scanId,created_at:now,status:"new",step_id:stepId||null,review_result:"pending",images:imageRows.map(r=>({id:r.id,view:r.view}))}},201);
}
