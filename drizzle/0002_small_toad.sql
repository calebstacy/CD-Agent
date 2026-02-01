CREATE TABLE `brand_voice_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designSystemId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`tone` json,
	`vocabulary` json,
	`patterns` json,
	`aiAnalysis` text,
	`confidence` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_voice_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `component_libraries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designSystemId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('button','input','card','modal','alert','custom') NOT NULL,
	`variants` json,
	`guidelines` text,
	`examples` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `component_libraries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_examples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designSystemId` int NOT NULL,
	`type` enum('button','error','success','empty_state','form_label','tooltip','navigation','heading','description','placeholder','other') NOT NULL,
	`text` text NOT NULL,
	`context` text,
	`componentVariant` varchar(100),
	`sourceUrl` text,
	`screenshot` text,
	`isApproved` boolean NOT NULL DEFAULT true,
	`rating` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_examples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `design_systems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`userId` int NOT NULL,
	`projectId` int,
	`colors` json,
	`typography` json,
	`spacing` json,
	`sourceType` enum('figma','upload','manual'),
	`sourceUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `design_systems_id` PRIMARY KEY(`id`)
);
