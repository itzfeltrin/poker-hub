ALTER TABLE `game_players` RENAME COLUMN "final_chips" TO "cash_out";--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_name_unique` ON `locations` (`name`);--> statement-breakpoint
ALTER TABLE `game_players` DROP COLUMN `initial_chips`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_games` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`buy_in` real NOT NULL,
	`chips_per_player` integer NOT NULL,
	`finished` integer DEFAULT false NOT NULL,
	`location_id` text,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_games`("id", "date", "buy_in", "chips_per_player", "finished", "location_id") SELECT "id", "date", "buy_in", "chips_per_player", "finished", "location_id" FROM `games`;--> statement-breakpoint
DROP TABLE `games`;--> statement-breakpoint
ALTER TABLE `__new_games` RENAME TO `games`;--> statement-breakpoint
PRAGMA foreign_keys=ON;