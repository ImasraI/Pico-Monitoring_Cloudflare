import { integer, sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  username: text("username"),
  name: text("name").notNull(),
  role: text("role", { enum: ["doctor", "patient"] }).notNull(),
  doctorId: text("doctor_id"),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [uniqueIndex("users_email_unique").on(table.email), uniqueIndex("users_username_unique").on(table.username), index("users_doctor_id_idx").on(table.doctorId)]);

export const patientProfiles = sqliteTable("patient_profiles", {
  userId: text("user_id").primaryKey(),
  birthDate: text("birth_date"),
  phone: text("phone").notNull().default(""),
  nationalId: text("national_id"),
  gender: text("gender").notNull().default(""),
  address: text("address").notNull().default(""),
  emergencyPhone: text("emergency_phone").notNull().default(""),
  healthHistory: text("health_history").notNull().default(""),
  allergies: text("allergies").notNull().default(""),
  medications: text("medications").notNull().default(""),
  personalCompletedAt: integer("personal_completed_at"),
  treatmentType: text("treatment_type").notNull().default(""),
  alignerCount: integer("aligner_count"),
  doctorNote: text("doctor_note").notNull().default(""),
  planNote: text("plan_note").notNull().default(""),
  nextScanAt: integer("next_scan_at"),
  nextVisitAt: integer("next_visit_at"),
  activatedAt: integer("activated_at"),
});

export const patientFiles = sqliteTable("patient_files", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  doctorId: text("doctor_id").notNull(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  mime: text("mime").notNull(),
  description: text("description").notNull().default(""),
  objectKey: text("object_key").notNull(),
  uploadedBy: text("uploaded_by"),
  createdAt: integer("created_at").notNull(),
}, table => [index("patient_files_patient_created_idx").on(table.patientId, table.createdAt)]);

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("sessions_user_id_idx").on(table.userId)]);

export const invites = sqliteTable("invites", {
  tokenHash: text("token_hash").primaryKey(),
  doctorId: text("doctor_id").notNull(),
  email: text("email").notNull(),
  patientName: text("patient_name").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
}, table => [index("invites_doctor_id_idx").on(table.doctorId)]);

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  doctorId: text("doctor_id").notNull(),
  patientId: text("patient_id").notNull(),
  senderId: text("sender_id").notNull(),
  kind: text("kind", { enum: ["normal", "urgent"] }).notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
  readAt: integer("read_at"),
}, table => [index("messages_patient_created_idx").on(table.patientId, table.createdAt)]);

export const scans = sqliteTable("scans", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  doctorId: text("doctor_id").notNull(),
  createdAt: integer("created_at").notNull(),
  status: text("status", { enum: ["new", "reviewed"] }).notNull(),
  doctorNote: text("doctor_note"),
  stepId: text("step_id"),
  reviewResult: text("review_result").notNull().default("pending"),
}, table => [index("scans_patient_created_idx").on(table.patientId, table.createdAt)]);

export const scanImages = sqliteTable("scan_images", {
  id: text("id").primaryKey(),
  scanId: text("scan_id").notNull(),
  patientId: text("patient_id").notNull(),
  objectKey: text("object_key").notNull(),
  mime: text("mime").notNull(),
  view: text("view", { enum: ["front", "right", "left"] }).notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("scan_images_scan_id_idx").on(table.scanId)]);

export const steps = sqliteTable("steps", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  doctorId: text("doctor_id").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  dueAt: integer("due_at").notNull(),
  completedAt: integer("completed_at"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  position: integer("position").notNull(),
  eventType: text("event_type").notNull().default("custom"),
  seriesId: text("series_id"),
  alignerNo: integer("aligner_no"),
  createdAt: integer("created_at").notNull(),
  opensAt: integer("opens_at"),
  pausedAt: integer("paused_at"),
  firstAttemptAt: integer("first_attempt_at"),
  attemptPoints: integer("attempt_points"),
  onTime: integer("on_time"),
  rewardPoints: integer("reward_points"),
}, table => [index("steps_patient_position_idx").on(table.patientId, table.position)]);

export const rewardSettings = sqliteTable("reward_settings", {
  patientId: text("patient_id").primaryKey(),
  alignerPoints: integer("aligner_points").notNull().default(10),
  scanPoints: integer("scan_points").notNull().default(20),
  latePoints: integer("late_points").notNull().default(5),
  bonusPoints: integer("bonus_points").notNull().default(10),
});
export const rewardPreferences = sqliteTable("reward_preferences", {
  patientId: text("patient_id").primaryKey(),
  mode: text("mode").notNull().default("auto"),
  target: integer("target").notNull().default(100),
  color: text("color").notNull().default("mint"),
  accessory: text("accessory").notNull().default("none"),
});
export const rewardLedger = sqliteTable("reward_ledger", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  kind: text("kind").notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("reward_ledger_patient_idx").on(table.patientId, table.createdAt)]);

export const patientNotes = sqliteTable("patient_notes", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  doctorId: text("doctor_id").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("patient_notes_patient_created_idx").on(table.patientId, table.createdAt)]);

export const notificationSettings = sqliteTable("notification_settings", {
  userId: text("user_id").primaryKey(),
  messages: integer("messages", { mode: "boolean" }).notNull().default(true),
  scans: integer("scans", { mode: "boolean" }).notNull().default(true),
  roadmap: integer("roadmap", { mode: "boolean" }).notNull().default(true),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  kind: text("kind", { enum: ["messages", "scans", "roadmap"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
  readAt: integer("read_at"),
}, table => [index("notifications_user_created_idx").on(table.userId, table.createdAt)]);

export const authAttempts = sqliteTable("auth_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});
