ALTER TABLE `games` ADD COLUMN `championship_id` text REFERENCES `championships`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX `games_championship_idx` ON `games` (`championship_id`);
--> statement-breakpoint
UPDATE `games`
SET `championship_id` = (
  SELECT `c`.`id` FROM `championships` `c`
  WHERE `c`.`group_id` = `games`.`group_id`
    AND substr(`games`.`date`, 1, 10) >= `c`.`start_date`
    AND substr(`games`.`date`, 1, 10) <= `c`.`end_date`
  LIMIT 1
)
WHERE `championship_id` IS NULL;
