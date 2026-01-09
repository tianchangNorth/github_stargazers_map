CREATE TABLE `countryStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryId` int NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`countryName` varchar(255) NOT NULL,
	`count` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `countryStats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locationCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`locationText` varchar(512) NOT NULL,
	`countryCode` varchar(2),
	`countryName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locationCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `locationCache_locationText_unique` UNIQUE(`locationText`)
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`url` varchar(512) NOT NULL,
	`starCount` int NOT NULL,
	`analyzedCount` int NOT NULL,
	`unknownCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `repositories_id` PRIMARY KEY(`id`),
	CONSTRAINT `repositories_fullName_unique` UNIQUE(`fullName`)
);
--> statement-breakpoint
CREATE INDEX `repo_country_idx` ON `countryStats` (`repositoryId`,`countryCode`);--> statement-breakpoint
CREATE INDEX `location_idx` ON `locationCache` (`locationText`);--> statement-breakpoint
CREATE INDEX `fullName_idx` ON `repositories` (`fullName`);