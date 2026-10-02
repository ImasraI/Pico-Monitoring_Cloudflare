CREATE TABLE `patient_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `patient_notes_patient_created_idx` ON `patient_notes` (`patient_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `steps` ADD `event_type` text DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE `steps` ADD `series_id` text;--> statement-breakpoint
ALTER TABLE `steps` ADD `aligner_no` integer;