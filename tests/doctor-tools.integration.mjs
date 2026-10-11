import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { adminFixture, createDoctorFixture, permissionKeys } from './account-fixture.mjs';

const base = process.env.DANTO_TEST_URL || 'http://127.0.0.1:4173';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local integration testing only.');
const stamp = Date.now(), password = 'TestPassword123!';
const anonymous = { cookie: '' }, doctor = { cookie: '' }, otherDoctor = { cookie: '' }, patient = { cookie: '' };
let checks = 0, sequence = 0;

async function call(actor, op, data, params = {}) {
  const form = data instanceof FormData;
  const response = await fetch(base + '/api?' + new URLSearchParams({ op, ...params }), {
    method: data === undefined ? 'GET' : 'POST',
    headers: { Cookie: actor.cookie, Origin: base, ...(data === undefined || form ? {} : { 'Content-Type': 'application/json' }) },
    body: data === undefined ? undefined : form ? data : JSON.stringify({ op, ...data }),
  });
  const cookie = response.headers.get('set-cookie');
  if (cookie) actor.cookie = cookie.split(';')[0];
  return { status: response.status, body: await response.json() };
}
async function expect(actor, op, data, status = 200, params) {
  const result = await call(actor, op, data, params);
  assert.equal(result.status, status, op + ': ' + JSON.stringify(result)); checks++;
  return result.body;
}
async function createPatient(actor, name) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    op: 'patient.create', name, phone: '093' + String((stamp + sequence++) % 100000000).padStart(8, '0'),
    nationalId: '0012345678', birthDate: '2010-01-01',
  })) form.set(key, value);
  return (await expect(actor, 'patient.create', form, 201)).patient;
}
async function notes(patientId) { return (await expect(doctor, 'notes', undefined, 200, { patientId })).notes; }
async function record(patientId) { return (await expect(doctor, 'patient.record', undefined, 200, { patientId })).profile; }

const admin = await adminFixture(base);
try {
  const account = await createDoctorFixture(base, admin, { name: 'پزشک نمونه پیام و یادداشت', password });
  const secondAccount = await createDoctorFixture(base, admin, { name: 'پزشک دیگر آزمون یادداشت', password });
  await expect(doctor, 'login', { identifier: account.username, password });
  await expect(otherDoctor, 'login', { identifier: secondAccount.username, password });
  const first = await createPatient(doctor, 'بیمار نمونه پیام و یادداشت');
  const second = await createPatient(doctor, 'بیمار دوم آزمون یادداشت');
  const outsider = await createPatient(otherDoctor, 'بیمار پزشک دیگر');
  await expect(patient, 'login', { identifier: first.username, password: '0012345678' });
  const profile = { treatmentType: 'aligner', alignerCount: 12, doctorNote: 'یادداشت اولیه پرونده برای پیگیری درمان', planNote: 'برنامه درمان باقی می‌ماند', nextScanAt: '2026-11-01', nextVisitAt: '2026-11-15' };
  await expect(doctor, 'patient.profile', { patientId: first.id, ...profile });
  const initialProfile = await record(first.id);
  await expect(doctor, 'note.create', { patientId: first.id, text: 'یادداشت قابل حذف' }, 201);
  await expect(doctor, 'note.create', { patientId: first.id, text: 'این یادداشت باید باقی بماند' }, 201);
  const firstNotes = await notes(first.id);
  const removable = firstNotes.find(note => note.body === 'یادداشت قابل حذف');
  const remaining = firstNotes.find(note => note.body === 'این یادداشت باید باقی بماند');
  assert.ok(removable && remaining); checks++;

  await expect(anonymous, 'note.delete', { patientId: first.id, noteId: removable.id }, 401);
  await expect(patient, 'notes', undefined, 403, { patientId: first.id });
  await expect(patient, 'note.delete', { patientId: first.id, noteId: removable.id }, 403);
  await expect(patient, 'note.delete', { patientId: first.id, noteId: 'initial' }, 403);
  await expect(admin, 'note.delete', { patientId: first.id, noteId: removable.id }, 403);
  await expect(otherDoctor, 'note.delete', { patientId: first.id, noteId: removable.id }, 404);
  await expect(otherDoctor, 'note.delete', { patientId: first.id, noteId: 'initial' }, 404);
  await expect(doctor, 'note.delete', { patientId: second.id, noteId: removable.id }, 404);
  await expect(doctor, 'note.delete', { patientId: outsider.id, noteId: 'initial' }, 404);
  await expect(doctor, 'note.delete', { patientId: first.id }, 400);
  await expect(doctor, 'note.delete', { patientId: first.id, noteId: {} }, 400);
  await expect(doctor, 'note.delete', { patientId: first.id, noteId: 'nonexistent' }, 404);
  assert.deepEqual(await notes(first.id), firstNotes); checks++;
  assert.deepEqual(await record(first.id), initialProfile); checks++;

  const doctorFields = { doctorId: account.id, name: account.name, phone: account.username, email: '', clinic: 'مطب آزمون', patientLimit: null, disabled: false };
  await expect(admin, 'admin.doctor.update', { ...doctorFields, permissions: permissionKeys.filter(key => !['treatment.manage', 'messages.send'].includes(key)) });
  await expect(doctor, 'note.delete', { patientId: first.id, noteId: removable.id }, 403);
  await expect(doctor, 'note.delete', { patientId: first.id, noteId: 'initial' }, 403);
  await expect(doctor, 'message', { patientId: first.id, text: 'ارسال بدون دسترسی' }, 403);
  assert.deepEqual(await notes(first.id), firstNotes); checks++;
  assert.deepEqual(await record(first.id), initialProfile); checks++;
  await expect(admin, 'admin.doctor.update', { ...doctorFields, permissions: permissionKeys });

  await expect(doctor, 'note.delete', { patientId: first.id, noteId: removable.id });
  assert.deepEqual(await notes(first.id), [remaining]); checks++;
  await expect(doctor, 'note.delete', { patientId: first.id, noteId: removable.id }, 404);
  await expect(doctor, 'note.delete', { patientId: first.id, noteId: 'initial' });
  assert.deepEqual(await record(first.id), { ...initialProfile, doctor_note: '' }); checks++;
  await expect(doctor, 'note.delete', { patientId: first.id, noteId: 'initial' }, 404);
  assert.deepEqual(await notes(first.id), [remaining]); checks++;
  const publicRecord = await expect(patient, 'patient.personal', undefined, 200, { patientId: first.id });
  assert.ok(!Object.hasOwn(publicRecord.profile, 'doctor_note') && !Object.hasOwn(publicRecord.profile, 'plan_note')); checks++;

  const regular = (await expect(doctor, 'message', { patientId: first.id, text: 'برنامه درمان شما بررسی شد.', kind: 'normal' }, 201)).message;
  const implicit = (await expect(doctor, 'message', { patientId: first.id, text: 'لطفاً اسکن بعدی را طبق برنامه ارسال کنید.' }, 201)).message;
  assert.equal(regular.kind, 'normal'); assert.equal(implicit.kind, 'normal'); checks++;
  const before = (await expect(patient, 'messages', undefined, 200, { patientId: first.id })).messages;
  await expect(doctor, 'message', { patientId: first.id, text: 'پیام فوری غیرمجاز پزشک', kind: 'urgent' }, 400);
  assert.deepEqual((await expect(patient, 'messages', undefined, 200, { patientId: first.id })).messages, before); checks++;
  const urgent = (await expect(patient, 'message', { patientId: first.id, text: 'برای الاینر فعلی نیاز به راهنمایی دارم.', kind: 'urgent' }, 201)).message;
  assert.equal(urgent.kind, 'urgent'); checks++;
  await expect(patient, 'message', { patientId: first.id, text: 'ممنون از راهنمایی شما.', kind: 'normal' }, 201);
  const received = (await expect(doctor, 'messages', undefined, 200, { patientId: first.id })).messages;
  assert.ok(received.some(message => message.id === urgent.id && message.kind === 'urgent' && message.sender_id === first.id)); checks++;
  await expect(otherDoctor, 'message', { patientId: first.id, text: 'پیام از پزشک دیگر' }, 404);

  // Leave synthetic examples for visual QA; no real patient records are touched.
  await expect(doctor, 'patient.profile', { patientId: first.id, ...profile });
  await mkdir('work', { recursive: true });
  await writeFile('work/doctor-tools-case.json', JSON.stringify({ doctorId: account.id, doctorPhone: account.username, patientId: first.id, patientPhone: first.username }));
  console.log(`PASS ${checks} doctor tools checks: scoped note deletion, initial-note deletion preserves profile, private notes, permission enforcement, normal doctor messages and urgent patient messages.`);
} finally {
  for (const actor of [doctor, otherDoctor, patient, admin]) {
    if (actor.cookie) await call(actor, 'logout', {});
  }
}
