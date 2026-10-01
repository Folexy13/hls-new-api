CREATE TABLE `WhatsAppDelivery` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `providerMessageId` VARCHAR(191) NOT NULL,
  `recipient` VARCHAR(64) NULL,
  `status` VARCHAR(32) NOT NULL,
  `conversationId` VARCHAR(191) NULL,
  `pricingCategory` VARCHAR(64) NULL,
  `errorCode` VARCHAR(64) NULL,
  `errorMessage` TEXT NULL,
  `eventTimestamp` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `deliveredAt` DATETIME(3) NULL,
  `readAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `WhatsAppDelivery_providerMessageId_key`(`providerMessageId`),
  INDEX `WhatsAppDelivery_status_eventTimestamp_idx`(`status`, `eventTimestamp`),
  INDEX `WhatsAppDelivery_recipient_idx`(`recipient`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
