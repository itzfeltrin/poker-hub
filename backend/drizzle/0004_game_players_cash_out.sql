PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_game_players` (
	`game_id` text NOT NULL,
	`player_id` text NOT NULL,
	`cash_out` integer,
	PRIMARY KEY(`game_id`, `player_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_game_players`("game_id", "player_id", "cash_out") SELECT "game_id", "player_id", "final_chips" FROM `game_players`;--> statement-breakpoint
INSERT INTO `game_player_buy_ins`("game_id", "player_id", "chips", "is_initial")
SELECT gp."game_id", gp."player_id", gp."initial_chips", 1
FROM `game_players` gp
WHERE NOT EXISTS (
  SELECT 1 FROM `game_player_buy_ins` b
  WHERE b."game_id" = gp."game_id"
    AND b."player_id" = gp."player_id"
    AND b."is_initial" = 1
);--> statement-breakpoint
DROP TABLE `game_players`;--> statement-breakpoint
ALTER TABLE `__new_game_players` RENAME TO `game_players`;--> statement-breakpoint
PRAGMA foreign_keys=ON;

