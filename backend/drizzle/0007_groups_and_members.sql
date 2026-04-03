-- Infer groups from exact player rosters per game; migrate game_players and buy-ins to group_member_id

CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_name_unique` ON `groups` (`name`);
--> statement-breakpoint
CREATE TABLE `_game_roster` (
	`game_id` text PRIMARY KEY NOT NULL,
	`roster_key` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `_game_roster` (`game_id`, `roster_key`)
SELECT
	g.`id`,
	COALESCE(
		(
			SELECT GROUP_CONCAT(s.`player_id`, '|')
			FROM (
				SELECT `player_id` FROM `game_players` gp WHERE gp.`game_id` = g.`id` ORDER BY `player_id`
			) AS s
		),
		''
	)
FROM `games` g;
--> statement-breakpoint
CREATE TABLE `_roster_group_map` (
	`roster_key` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`display_n` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `_roster_group_map` (`roster_key`, `group_id`, `display_n`)
SELECT
	`roster_key`,
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
	ROW_NUMBER() OVER (ORDER BY `roster_key`)
FROM (SELECT DISTINCT `roster_key` FROM `_game_roster`);
--> statement-breakpoint
INSERT INTO `groups` (`id`, `name`)
SELECT `group_id`, 'Grupo ' || CAST(`display_n` AS text) FROM `_roster_group_map`;
--> statement-breakpoint
-- Drizzle runs migrations in a transaction; PRAGMA foreign_keys=OFF is ignored there, so we must
-- not DROP `games` while `game_players` / `game_player_buy_ins` still reference it.
INSERT INTO `groups` (`id`, `name`)
SELECT '00000000-0000-4000-8000-000000000001', 'Padrão'
WHERE (SELECT COUNT(*) FROM `groups`) = 0;
--> statement-breakpoint
ALTER TABLE `games` ADD COLUMN `group_id` text REFERENCES `groups`(`id`);
--> statement-breakpoint
UPDATE `games`
SET `group_id` = (
	SELECT m.`group_id`
	FROM `_game_roster` gr
	JOIN `_roster_group_map` m ON m.`roster_key` = gr.`roster_key`
	WHERE gr.`game_id` = `games`.`id`
);
--> statement-breakpoint
UPDATE `games`
SET `group_id` = '00000000-0000-4000-8000-000000000001'
WHERE `group_id` IS NULL;
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`player_id` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_members_group_player_unique` ON `group_members` (`group_id`,`player_id`);
--> statement-breakpoint
INSERT INTO `group_members` (`id`, `group_id`, `player_id`)
SELECT DISTINCT
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
	m.`group_id`,
	gp.`player_id`
FROM `game_players` gp
JOIN `_game_roster` gr ON gr.`game_id` = gp.`game_id`
JOIN `_roster_group_map` m ON m.`roster_key` = gr.`roster_key`;
--> statement-breakpoint
ALTER TABLE `game_players` RENAME TO `game_players_old`;
--> statement-breakpoint
CREATE TABLE `game_players` (
	`game_id` text NOT NULL,
	`group_member_id` text NOT NULL,
	`cash_out` integer,
	PRIMARY KEY(`game_id`, `group_member_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_member_id`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `game_players` (`game_id`, `group_member_id`, `cash_out`)
SELECT
	gpo.`game_id`,
	gm.`id`,
	gpo.`cash_out`
FROM `game_players_old` gpo
JOIN `games` g ON g.`id` = gpo.`game_id`
JOIN `group_members` gm ON gm.`group_id` = g.`group_id` AND gm.`player_id` = gpo.`player_id`;
--> statement-breakpoint
DROP TABLE `game_players_old`;
--> statement-breakpoint
ALTER TABLE `game_player_buy_ins` RENAME TO `game_player_buy_ins_old`;
--> statement-breakpoint
CREATE TABLE `game_player_buy_ins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`group_member_id` text NOT NULL,
	`chips` integer NOT NULL,
	`is_initial` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_member_id`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `game_player_buy_ins` (`game_id`, `group_member_id`, `chips`, `is_initial`)
SELECT
	bio.`game_id`,
	gm.`id`,
	bio.`chips`,
	bio.`is_initial`
FROM `game_player_buy_ins_old` bio
JOIN `games` g ON g.`id` = bio.`game_id`
JOIN `group_members` gm ON gm.`group_id` = g.`group_id` AND gm.`player_id` = bio.`player_id`;
--> statement-breakpoint
DROP TABLE `game_player_buy_ins_old`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_game_roster`;
--> statement-breakpoint
DROP TABLE IF EXISTS `_roster_group_map`;
