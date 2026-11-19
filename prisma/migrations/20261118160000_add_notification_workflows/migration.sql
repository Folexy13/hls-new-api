ALTER TABLE `User` ADD COLUMN `notificationRemindersEnabled` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `QuizCode` ADD COLUMN `notificationRemindersEnabled` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `NotificationJob` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(64) NOT NULL,
  `userId` INTEGER NULL,
  `quizCodeId` INTEGER NULL,
  `payload` JSON NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `attemptCount` INTEGER NOT NULL DEFAULT 0,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lockedAt` DATETIME(3) NULL,
  `claimToken` VARCHAR(64) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `NotificationJob_idempotencyKey_key` (`idempotencyKey`),
  INDEX `NotificationJob_status_nextAttemptAt_idx` (`status`, `nextAttemptAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `NotificationJob_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `NotificationJob_quizCodeId_fkey` FOREIGN KEY (`quizCodeId`) REFERENCES `QuizCode` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PharmacyRequest` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `pharmacyName` TEXT NOT NULL,
  `pharmacyPhone` VARCHAR(64) NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `approvedById` INTEGER NULL,
  `acceptedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PharmacyRequest_userId_key` (`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PharmacyRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupportReply` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `ticketId` INTEGER NOT NULL,
  `authorId` INTEGER NOT NULL,
  `requestId` VARCHAR(64) NOT NULL,
  `message` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SupportReply_requestId_key` (`requestId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SupportReply_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Inbox` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
