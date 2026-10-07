CREATE TABLE `championships` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championships_group_name_unique` ON `championships` (`group_id`, `name`);
--> statement-breakpoint
CREATE INDEX `championships_group_idx` ON `championships` (`group_id`);
