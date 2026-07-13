DROP INDEX `members_licence_unique`;--> statement-breakpoint
ALTER TABLE `members` ADD `season` text DEFAULT '25-26' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `members_licence_season_idx` ON `members` (`licence`,`season`);