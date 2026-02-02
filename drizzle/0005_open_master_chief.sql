CREATE TABLE `knowledge_chunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`content` text NOT NULL,
	`chunkIndex` int NOT NULL,
	`embedding` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('style_guide','voice_tone','terminology','research','best_practices','component_guidelines','accessibility','other') NOT NULL,
	`content` text NOT NULL,
	`sourceUrl` text,
	`sourceType` enum('upload','url','manual') NOT NULL DEFAULT 'manual',
	`version` varchar(50),
	`lastReviewedAt` timestamp,
	`reviewedBy` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`chunkCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','editor','viewer') NOT NULL DEFAULT 'viewer',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(100),
	`color` varchar(20),
	`parentId` int,
	`ownerId` int NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT false,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `copy_patterns` ADD `workspaceId` int;