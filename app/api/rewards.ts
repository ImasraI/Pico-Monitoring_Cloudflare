export type RewardStep = { id: string; title: string; event_type: string; due_at: number; opens_at: number | null; paused_at: number | null; completed_at: number | null; first_attempt_at: number | null; attempt_points: number | null; reward_points: number | null; position: number; on_time: number | null; points_awarded: number };
type Rules = { aligner_points: number; scan_points: number; late_points: number; bonus_points: number };
const defaults: Rules = { aligner_points: 10, scan_points: 20, late_points: 5, bonus_points: 10 };
export class RewardError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const windowStart = (due: number) => Math.floor((due + 12600000) / 86400000) * 86400000 - 12600000;
export async function rules(db: D1Database, patientId: string): Promise<Rules> { return await db.prepare("SELECT aligner_points,scan_points,late_points,bonus_points FROM reward_settings WHERE patient_id=?").bind(patientId).first<Rules>() ?? defaults; }
export async function getStep(db: D1Database, patientId: string, id: string) {
  const step = await db.prepare("SELECT * FROM steps WHERE patient_id=? AND id=?").bind(patientId,id).first<RewardStep>();
  if (!step) throw new RewardError("مرحله پیدا نشد",404); return step;
}
export async function ensureReady(db: D1Database, patientId: string, step: RewardStep, now: number) {
  if (step.completed_at) throw new RewardError("این مرحله قبلاً تکمیل شده است",409);
  if (step.paused_at) throw new RewardError("این مرحله با تصمیم پزشک متوقف شده است",409);
  if (now < (step.opens_at ?? windowStart(step.due_at))) throw new RewardError("بازه مجاز این مرحله هنوز شروع نشده است",409);
  if (step.event_type === "aligner" && await db.prepare("SELECT id FROM steps WHERE patient_id=? AND event_type='aligner' AND completed_at IS NULL AND paused_at IS NULL AND (due_at<? OR (due_at=? AND position<?)) LIMIT 1").bind(patientId,step.due_at,step.due_at,step.position).first()) throw new RewardError("ابتدا تعویض الاینر قبلی را ثبت کنید",409);
}
export async function score(db: D1Database, patientId: string, step: RewardStep, now: number) {
  const r = await rules(db,patientId), timely = now <= step.due_at;
  const full = step.reward_points ?? (step.event_type === "aligner" ? r.aligner_points : r.scan_points);
  return { points: timely ? full : Math.min(full,r.late_points), timely };
}
// Walk assigned stages in schedule order. Unresolved stages wait; pauses are skipped.
// A deterministic anchor and INSERT OR IGNORE make repeated/concurrent reviews safe.
export async function awardBonuses(db: D1Database, patientId: string, doctorId: string) {
  const rows = (await db.prepare("SELECT * FROM steps WHERE patient_id=? AND event_type IN ('aligner','scan') AND paused_at IS NULL ORDER BY due_at,position,id").bind(patientId).all<RewardStep>()).results;
  const r = await rules(db,patientId);
  const claims=(await db.prepare("SELECT id FROM reward_ledger WHERE patient_id=? AND kind='claim'").bind(patientId).all<{id:string}>()).results;
  const claimed=new Set(claims.map(x=>x.id)); let group:RewardStep[]=[];
  const awards: D1PreparedStatement[]=[];
  for (const row of rows) {
    if (!row.completed_at) break;
    if (row.on_time === null) continue; // Keep historical points without inventing a streak.
    if (!row.on_time) { group=[]; continue; }
    if(claimed.has(`claim:${patientId}:${row.id}`))continue;
    group.push(row);
    if(group.length===3){
      const id=`bonus:${patientId}:${row.id}`,keys=group.map(x=>`claim:${patientId}:${x.id}`),now=Date.now();
      awards.push(db.prepare("INSERT OR IGNORE INTO reward_ledger (id,patient_id,kind,points,reason,created_by,created_at) SELECT ?,?,'bonus',?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM reward_ledger WHERE id IN (?,?,?))").bind(id,patientId,r.bonus_points,"سه مرحله متوالی به‌موقع",doctorId,now,...keys));
      for(const key of keys)awards.push(db.prepare("INSERT OR IGNORE INTO reward_ledger (id,patient_id,kind,points,reason,created_by,created_at) SELECT ?,?,'claim',0,?,?,? WHERE EXISTS (SELECT 1 FROM reward_ledger WHERE id=?)").bind(key,patientId,id,doctorId,now,id));
      group=[];
    }
  }
  if (awards.length) await db.batch(awards);
}
export async function summary(db: D1Database, patientId: string) {
  const [r, p, profile, rows, ledger] = await Promise.all([
    rules(db,patientId),
    db.prepare("SELECT mode,target,color,accessory FROM reward_preferences WHERE patient_id=?").bind(patientId).first<{mode:string;target:number;color:string;accessory:string}>(),
    db.prepare("SELECT birth_date FROM patient_profiles WHERE user_id=?").bind(patientId).first<{birth_date:string|null}>(),
    db.prepare("SELECT * FROM steps WHERE patient_id=? ORDER BY due_at,position,id").bind(patientId).all<RewardStep>(),
    db.prepare("SELECT l.id,l.kind,l.points,l.reason,l.created_at,u.name AS creator_name FROM reward_ledger l LEFT JOIN users u ON u.id=l.created_by WHERE l.patient_id=? AND l.kind<>'claim' ORDER BY l.created_at DESC,l.id").bind(patientId).all<{id:string;kind:string;points:number;reason:string;created_at:number;creator_name:string}>(),
  ]);
  const now = new Date(), birth = profile?.birth_date ? new Date(profile.birth_date+"T12:00:00Z") : null;
  const age = birth ? now.getUTCFullYear()-birth.getUTCFullYear() - (now.toISOString().slice(5,10)<profile!.birth_date!.slice(5,10)?1:0) : 18;
  const auto = age<12 ? "child" : age<18 ? "teen" : "adult";
  const preferences = p ?? {mode:"auto",target:100,color:"mint",accessory:"none"};
  const earned = rows.results.reduce((s,x)=>s+x.points_awarded,0);
  const total = earned+ledger.results.reduce((s,x)=>s+x.points,0);
  const lifetime = earned+ledger.results.reduce((s,x)=>s+Math.max(0,x.points),0);
  const eligible = rows.results.filter(x=>["scan","aligner"].includes(x.event_type) && !x.paused_at && x.on_time !== null && x.completed_at);
  let streak=0; for (const x of rows.results.filter(x=>["scan","aligner"].includes(x.event_type)&&!x.paused_at)) { if(!x.completed_at)break; if(x.on_time===null)continue; streak=x.on_time?streak+1:0; }
  const timely=eligible.filter(x=>x.on_time).length, scans=eligible.filter(x=>x.event_type==="scan").length, aligners=eligible.filter(x=>x.event_type==="aligner").length;
  const badges=[{id:"start",title:"شروع پیگیری",earned:eligible.length>=1,progress:eligible.length,target:1},{id:"consistent",title:"نظم درمان",earned:timely>=3,progress:timely,target:3},{id:"scans",title:"پیگیری تصویری",earned:scans>=5,progress:scans,target:5},{id:"aligners",title:"پیگیری الاینر",earned:aligners>=10,progress:aligners,target:10}];
  const history=[...rows.results.filter(x=>x.completed_at && x.points_awarded).map(x=>({id:x.id,kind:x.event_type,points:x.points_awarded,reason:x.title,created_at:x.completed_at!})),...ledger.results].sort((a,b)=>b.created_at-a.created_at);
  return { rules:r,preferences,mode:preferences.mode==="auto"?auto:preferences.mode,total:Math.max(0,total),lifetime,streak,timely,badges,history:history.slice(0,100),pending:rows.results.filter(x=>x.first_attempt_at && !x.completed_at).length };
}
export async function action(db: D1Database, op: string, body: Record<string,unknown>, patientId: string, doctorId: string, isDoctor: boolean) {
  if (op === "rewards.preferences") {
    if (isDoctor) throw new RewardError("ظاهر و هدف شخصی را بیمار انتخاب می‌کند",403);
    const mode=String(body.mode),color=String(body.color),accessory=String(body.accessory),target=Number(body.target);
    if (!["auto","child","teen","adult"].includes(mode) || !Number.isInteger(target) || target<10 || target>10000) throw new RewardError("ظاهر یا هدف معتبر نیست");
    const s=await summary(db,patientId),colors:Record<string,number>={mint:0,blue:50,purple:100,gold:200},accessories:Record<string,number>={none:0,cap:75,scarf:150};
    if (!(color in colors) || !(accessory in accessories) || s.lifetime<colors[color] || s.lifetime<accessories[accessory]) throw new RewardError("این ظاهر هنوز باز نشده است",409);
    await db.prepare("INSERT INTO reward_preferences (patient_id,mode,target,color,accessory) VALUES (?,?,?,?,?) ON CONFLICT(patient_id) DO UPDATE SET mode=excluded.mode,target=excluded.target,color=excluded.color,accessory=excluded.accessory").bind(patientId,mode,target,color,accessory).run();
    return {ok:true};
  }
  if (!isDoctor) throw new RewardError("دسترسی مجاز نیست",403);
  if (op === "rewards.rules") {
    const values=[body.alignerPoints,body.scanPoints,body.latePoints,body.bonusPoints].map(Number);
    if(values.some(x=>!Number.isInteger(x)||x<0||x>500)||values[2]>Math.min(values[0],values[1])) throw new RewardError("امتیازها باید از صفر تا ۵۰۰ باشند؛ امتیاز دیرهنگام از امتیاز اصلی بیشتر نباشد");
    await db.prepare("INSERT INTO reward_settings (patient_id,aligner_points,scan_points,late_points,bonus_points) VALUES (?,?,?,?,?) ON CONFLICT(patient_id) DO UPDATE SET aligner_points=excluded.aligner_points,scan_points=excluded.scan_points,late_points=excluded.late_points,bonus_points=excluded.bonus_points").bind(patientId,...values).run();return {ok:true};
  }
  if (op === "rewards.correct") {
    const delta=Number(body.points),reason=String(body.reason??"").trim(),id=String(body.requestId??"");
    if(!Number.isInteger(delta)||!delta||Math.abs(delta)>1000||reason.length<3||reason.length>500||!/^[a-f0-9-]{36}$/.test(id))throw new RewardError("مقدار اصلاح و دلیل آن را وارد کنید");
    const result=await db.prepare("INSERT OR IGNORE INTO reward_ledger (id,patient_id,kind,points,reason,created_by,created_at) SELECT ?,?,'correction',?,?,?,? WHERE ?+(SELECT COALESCE(SUM(points_awarded),0) FROM steps WHERE patient_id=?)+(SELECT COALESCE(SUM(points),0) FROM reward_ledger WHERE patient_id=?)>=0").bind(`correction:${patientId}:${id}`,patientId,delta,reason,doctorId,Date.now(),delta,patientId,patientId).run();
    if(!result.meta.changes && !await db.prepare("SELECT id FROM reward_ledger WHERE id=?").bind(`correction:${patientId}:${id}`).first())throw new RewardError("امتیاز نهایی نمی‌تواند منفی باشد",409);
    return {ok:true};
  }
  throw new RewardError("درخواست ناشناخته است",404);
}
