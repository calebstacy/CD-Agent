CREATE TABLE `generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`contentType` enum('button','error','success','empty_state','form_label','tooltip','navigation','heading','description','placeholder') NOT NULL,
	`purpose` text NOT NULL,
	`context` text,
	`brandVoice` text,
	`suggestions` json NOT NULL,
	`selectedSuggestion` text,
	`model` varchar(100),
	`tokensUsed` int,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`isInLibrary` boolean NOT NULL DEFAULT false,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`userId` int NOT NULL,
	`teamId` int,
	`brandVoice` text,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`ownerId` int NOT NULL,
	`brandVoicePreset` text,
	`brandVoiceCustom` text,
	`brandGuidelines` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`teamId` int,
	`date` timestamp NOT NULL,
	`generationsCount` int NOT NULL DEFAULT 0,
	`contentTypeBreakdown` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','pro','team','business','enterprise') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','canceled','past_due','trialing');--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `currentPeriodEnd` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `generationsThisMonth` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `generationsTotal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastResetDate` timestamp DEFAULT (now()) NOT NULL;