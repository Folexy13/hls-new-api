CREATE TABLE `EmailDelivery` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `recipient` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `htmlBody` LONGTEXT NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `attemptCount` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `nextAttemptAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `EmailDelivery_idempotencyKey_key`(`idempotencyKey`),
  INDEX `EmailDelivery_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
  INDEX `EmailDelivery_recipient_idx`(`recipient`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
