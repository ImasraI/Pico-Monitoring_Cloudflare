PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`username` text,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`doctor_id` text,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "username", "name", "role", "doctor_id", "password_hash", "password_salt", "created_at") SELECT "id", "email", NULL, "name", "role", "doctor_id", "password_hash", "password_salt", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_doctor_id_idx` ON `users` (`doctor_id`);--> statement-breakpoint
ALTER TABLE `patient_files` ADD `uploaded_by` text;--> statement-breakpoint
ALTER TABLE `patient_profiles` ADD `national_id` text;--> statement-breakpoint
ALTER TABLE `patient_profiles` ADD `address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_profiles` ADD `emergency_phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_profiles` ADD `health_history` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_profiles` ADD `allergies` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_profiles` ADD `medications` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `patient_profiles` ADD `personal_completed_at` integer;
