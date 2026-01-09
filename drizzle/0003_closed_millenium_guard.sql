CREATE TABLE `analysisTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`repoUrl` varchar(512) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`maxStargazers` int NOT NULL,
	`status` enum('pending','running','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`currentStep` text,
	`errorMessage` text,
	`repositoryId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `analysisTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `analysisTasks` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `analysisTasks` (`status`);