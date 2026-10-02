CREATE TABLE `reward_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`kind` text NOT NULL,
	`points` integer NOT NULL,
	`reason` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reward_ledger_patient_idx` ON `reward_ledger` (`patient_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reward_preferences` (
	`patient_id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'auto' NOT NULL,
	`target` integer DEFAULT 100 NOT NULL,
	`color` text DEFAULT 'mint' NOT NULL,
	`accessory` text DEFAULT 'none' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reward_settings` (
	`patient_id` text PRIMARY KEY NOT NULL,
	`aligner_points` integer DEFAULT 10 NOT NULL,
	`scan_points` integer DEFAULT 20 NOT NULL,
	`late_points` integer DEFAULT 5 NOT NULL,
	`bonus_points` integer DEFAULT 10 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `scans` ADD `step_id` text;--> statement-breakpoint
ALTER TABLE `scans` ADD `review_result` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `steps` ADD `opens_at` integer;--> statement-breakpoint
ALTER TABLE `steps` ADD `paused_at` integer;--> statement-breakpoint
ALTER TABLE `steps` ADD `first_attempt_at` integer;--> statement-breakpoint
ALTER TABLE `steps` ADD `attempt_points` integer;--> statement-breakpoint
ALTER TABLE `steps` ADD `on_time` integer;--> statement-breakpoint
ALTER TABLE `steps` ADD `reward_points` integer;