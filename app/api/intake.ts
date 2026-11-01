import schema from "../../public/intake-schema.json";

type Question = { id: string; type: string; opts?: string[]; fields?: string[][] };
type Answer = { value: unknown; deferred: boolean };
type Row = { answers_json: string; revision: number; updated_at: number; submitted_at: number | null };
const questions = (schema.sections as { items: Question[] }[]).flatMap(section => section.items);
const questionMap = new Map(questions.map(question => [question.id, question]));
export class IntakeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const digits = (value: string) => value.replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632));
function text(value: unknown, limit = 1200) {
  if (typeof value !== "string" || value.length > limit) throw new IntakeError("طول یا نوع یکی از پاسخ‌ها معتبر نیست");
  return value.trim();
}
function date(value: unknown) {
  const result = digits(text(value, 10)).replace(/-/g, "/");
  const match = /^(1[34]\d{2})\/(\d{1,2})\/(\d{1,2})$/.exec(result);
  if (!match) throw new IntakeError("تاریخ شمسی را به شکل سال/ماه/روز وارد کنید");
  const year = +match[1], month = +match[2], day = +match[3];
  const max = month <= 6 ? 31 : month <= 11 ? 30 : [1,5,9,13,17,22,26,30].includes(year % 33) ? 30 : 29;
  if (month < 1 || month > 12 || day < 1 || day > max) throw new IntakeError("تاریخ شمسی معتبر نیست");
  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}
function metric(value: unknown, min = 1, max = 300) {
  if (value === "" || value == null) return "";
  const number = Number(digits(String(value)));
  if (!Number.isFinite(number) || number < min || number > max) throw new IntakeError("اندازه واردشده در محدوده مجاز نیست");
  return String(number);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") throw new IntakeError("ساختار پاسخ معتبر نیست");
  return value as Record<string, unknown>;
}
function validate(question: Question, value: unknown): unknown {
  if (value === "" || value === null) return null;
  switch (question.type) {
    case "text": return text(value);
    case "date": return date(value);
    case "height": return metric(typeof value === "object" ? object(value).cm : value, 30, 260);
    case "single": {
      if (!question.opts?.includes(String(value))) throw new IntakeError("یکی از گزینه‌های پاسخ معتبر نیست");
      return value;
    }
    case "multi": {
      if (!Array.isArray(value) || value.length > (question.opts?.length ?? 0) || value.some(item => typeof item !== "string" || !question.opts?.includes(item))) throw new IntakeError("گزینه‌های انتخاب‌شده معتبر نیستند");
      return [...new Set(value)];
    }
    case "history":
    case "yesdetail": {
      const raw = object(value), key = question.type === "history" ? "choice" : "answer";
      const options = question.type === "history" ? ["بله", "خیر"] : question.opts ?? ["بله", "خیر", "نمی‌دانم"];
      if (!options.includes(String(raw[key]))) throw new IntakeError("گزینه پاسخ را مشخص کنید");
      return { [key]: raw[key], detail: raw[key] === "بله" ? text(raw.detail ?? "") : "" };
    }
    case "fields": {
      const raw = object(value);
      return Object.fromEntries((question.fields ?? []).map(([key]) => [key, metric(raw[key])]));
    }
    case "siblingMetrics": {
      const raw = object(value);
      if (!["دارد", "ندارد", "نمی‌دانم"].includes(String(raw.status))) throw new IntakeError("وضعیت خواهر و برادر را مشخص کنید");
      if (raw.status !== "دارد") return { status: raw.status, entries: [] };
      if (!Array.isArray(raw.entries) || raw.entries.length > 3) throw new IntakeError("حداکثر سه نفر قابل ثبت هستند");
      return { status: raw.status, entries: raw.entries.map(item => { const entry = object(item); return { height: metric(entry.height), weight: metric(entry.weight) }; }) };
    }
    default: throw new IntakeError("نوع پرسش معتبر نیست");
  }
}
function present(question: Question, answer?: Answer) {
  if (!answer || answer.deferred || answer.value == null || answer.value === "") return false;
  if (question.type === "multi") return Array.isArray(answer.value) && answer.value.length > 0;
  if (question.type === "fields") return Object.values(answer.value as object).every(value => value !== "");
  if (question.type === "siblingMetrics") {
    const value = answer.value as { status: string; entries: { height: string; weight: string }[] };
    return value.status !== "دارد" || value.entries.some(entry => entry.height && entry.weight);
  }
  if (question.type === "yesdetail" || question.type === "history") { const value = answer.value as { answer?: string; choice?: string; detail: string }; return (value.answer ?? value.choice) !== "بله" || Boolean(value.detail); }
  return true;
}
async function identity(db: D1Database, patientId: string) {
  const person = await db.prepare("SELECT u.name,p.birth_date FROM users u LEFT JOIN patient_profiles p ON p.user_id=u.id WHERE u.id=?").bind(patientId).first<{ name: string; birth_date: string | null }>();
  const answers: Record<string, Answer> = {};
  if (person) for (const id of ["patient_name", "med_name"]) answers[id] = { value: person.name, deferred: false };
  if (person?.birth_date) {
    const formatted = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" }).formatToParts(new Date(person.birth_date + "T12:00:00Z"));
    const part = (name: string) => formatted.find(item => item.type === name)?.value;
    answers.med_birth = { value: `${part("year")}/${part("month")}/${part("day")}`, deferred: false };
  }
  return answers;
}
function summary(row: Row | null, canonical: Record<string, Answer>) {
  const answers = { ...(row ? JSON.parse(row.answers_json) as Record<string, Answer> : {}), ...canonical };
  const missing = questions.filter(question => !present(question, answers[question.id])).map(question => question.id);
  return { answers, total: questions.length, answered: questions.length - missing.length, missing, revision: row?.revision ?? 0, updatedAt: row?.updated_at ?? null, submittedAt: row?.submitted_at ?? null };
}
export async function readIntake(db: D1Database, patientId: string) {
  const row = await db.prepare("SELECT answers_json,revision,updated_at,submitted_at FROM patient_intakes WHERE patient_id=?").bind(patientId).first<Row>();
  return summary(row, await identity(db, patientId));
}
export async function saveIntake(db: D1Database, patientId: string, body: Record<string, unknown>) {
  const raw = object(body.answers);
  if (new TextEncoder().encode(JSON.stringify(raw)).byteLength > 100_000) throw new IntakeError("حجم پاسخ‌ها بیش از حد مجاز است");
  if (!Number.isInteger(body.revision) || Number(body.revision) < 0 || (body.submit !== undefined && typeof body.submit !== "boolean")) throw new IntakeError("نسخه پرونده معتبر نیست");
  const answers: Record<string, Answer> = {};
  for (const [id, entry] of Object.entries(raw)) {
    const question = questionMap.get(id); if (!question) throw new IntakeError("پرسش ناشناخته است");
    const answer = object(entry);
    if (typeof answer.deferred !== "boolean") throw new IntakeError("وضعیت پاسخ معتبر نیست");
    answers[id] = { deferred: answer.deferred, value: answer.deferred ? null : validate(question, answer.value) };
  }
  Object.assign(answers, await identity(db, patientId));
  const current = await db.prepare("SELECT revision,submitted_at FROM patient_intakes WHERE patient_id=?").bind(patientId).first<{ revision: number; submitted_at: number | null }>();
  if ((current?.revision ?? 0) !== body.revision) throw new IntakeError("پرونده در جای دیگری تغییر کرده است؛ نسخه تازه را دریافت کنید", 409);
  const now = Date.now(), submittedAt = body.submit ? now : current?.submitted_at ?? null;
  const result = await db.prepare("INSERT INTO patient_intakes (patient_id,answers_json,revision,updated_at,submitted_at) VALUES (?,?,1,?,?) ON CONFLICT(patient_id) DO UPDATE SET answers_json=excluded.answers_json,revision=patient_intakes.revision+1,updated_at=excluded.updated_at,submitted_at=excluded.submitted_at WHERE patient_intakes.revision=?").bind(patientId, JSON.stringify(answers), now, submittedAt, body.revision).run();
  if (!result.meta.changes) throw new IntakeError("پرونده هم‌زمان تغییر کرده است؛ نسخه تازه را دریافت کنید", 409);
  return readIntake(db, patientId);
}
