ALTER TABLE `NotificationJob` ADD COLUMN `providerMessageId` VARCHAR(191) NULL;
CREATE INDEX `NotificationJob_providerMessageId_idx` ON `NotificationJob`(`providerMessageId`);

CREATE TABLE `Invoice` (
  `id` VARCHAR(36) NOT NULL,
  `sourceKey` VARCHAR(64) NOT NULL,
  `userId` INTEGER NOT NULL,
  `snapshot` JSON NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Invoice_sourceKey_key` (`sourceKey`),
  INDEX `Invoice_userId_createdAt_idx` (`userId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Invoice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
