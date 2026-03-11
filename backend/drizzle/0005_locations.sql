-- Create locations table
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `locations_name_unique` ON `locations` (`name`);--> statement-breakpoint

-- Seed locations from existing game location values
INSERT INTO `locations` (`id`, `name`)
SELECT 
  lower(substr(hex(randomblob(4)), 1, 8) || '-' ||
        substr(hex(randomblob(2)), 1, 4) || '-' ||
        substr(hex(randomblob(2)), 1, 4) || '-' ||
        substr(hex(randomblob(2)), 1, 4) || '-' ||
        substr(hex(randomblob(6)), 1, 12)),
  `location`
FROM `games`
WHERE `location` IS NOT NULL
GROUP BY `location`;--> statement-breakpoint

-- Add location_id column using ALTER TABLE (SQLite 3.35.0+)
ALTER TABLE `games` ADD COLUMN `location_id` text REFERENCES `locations`(`id`);--> statement-breakpoint

-- Update games with location_id from locations table
UPDATE `games`
SET `location_id` = (SELECT `id` FROM `locations` WHERE `locations`.`name` = `games`.`location`)
WHERE `location` IS NOT NULL;--> statement-breakpoint

-- Drop the old location column (SQLite 3.35.0+ supports DROP COLUMN)
ALTER TABLE `games` DROP COLUMN `location`;
