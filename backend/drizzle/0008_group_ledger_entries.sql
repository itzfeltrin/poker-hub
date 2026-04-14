CREATE TABLE `group_ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`group_member_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`transaction_type` text NOT NULL,
	`game_id` text,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`group_member_id`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	CHECK (`transaction_type` IN ('game', 'payment', 'manual'))
);
--> statement-breakpoint
CREATE INDEX `group_ledger_entries_group_member_idx` ON `group_ledger_entries` (`group_member_id`);
--> statement-breakpoint
CREATE INDEX `group_ledger_entries_game_idx` ON `group_ledger_entries` (`game_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_ledger_entries_game_member_unique` ON `group_ledger_entries` (`game_id`, `group_member_id`) WHERE `game_id` IS NOT NULL;
