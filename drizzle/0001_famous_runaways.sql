CREATE TABLE `patient_files` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`mime` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`object_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `patient_files_patient_created_idx` ON `patient_files` (`patient_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `patient_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`birth_date` text,
	`phone` text DEFAULT '' NOT NULL,
	`gender` text DEFAULT '' NOT NULL,
	`treatment_type` text DEFAULT '' NOT NULL,
	`aligner_count` integer,
	`doctor_note` text DEFAULT '' NOT NULL,
	`plan_note` text DEFAULT '' NOT NULL,
	`next_scan_at` integer,
	`next_visit_at` integer,
	`activated_at` integer
);
