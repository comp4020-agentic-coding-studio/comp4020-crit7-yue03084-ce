ALTER TABLE `bookings` ADD `lights_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `rate` text DEFAULT 'student' NOT NULL;