ALTER TABLE `User`
  ADD COLUMN `preferredPharmacyName` TEXT NULL,
  ADD COLUMN `preferredPharmacyPhone` TEXT NULL;

ALTER TABLE `Withdrawal`
  ADD COLUMN `transferReference` VARCHAR(191) NULL,
  ADD COLUMN `transferRecipientCode` VARCHAR(191) NULL;

ALTER TABLE `QuizCode`
  MODIFY `allergies` JSON NULL,
  MODIFY `scares` JSON NULL,
  MODIFY `familyCondition` JSON NULL,
  MODIFY `medications` JSON NULL,
  ADD COLUMN `currentConditions` JSON NULL;

ALTER TABLE `ResearcherPackItem`
  ADD COLUMN `selectedWholesalerName` VARCHAR(191) NULL,
  ADD COLUMN `selectedWholesalerPrice` DOUBLE NULL,
  ADD COLUMN `selectedWholesalerContact` VARCHAR(191) NULL,
  ADD COLUMN `selectedWholesalerAddress` VARCHAR(191) NULL,
  ADD COLUMN `selectedWholesalerDetails` JSON NULL,
  ADD COLUMN `requiresReselection` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `dispatchedWithoutWholesaler` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `effectiveMarkupFactor` DOUBLE NOT NULL DEFAULT 1.3;

CREATE TABLE `PrincipalCredit` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `principalId` INTEGER NOT NULL,
  `walletId` INTEGER NOT NULL,
  `quizCode` VARCHAR(191) NOT NULL,
  `packDbId` INTEGER NULL,
  `packId` VARCHAR(191) NOT NULL,
  `packName` VARCHAR(191) NOT NULL,
  `benfekName` VARCHAR(191) NOT NULL,
  `orderId` INTEGER NULL,
  `paymentId` INTEGER NULL,
  `paymentReference` VARCHAR(191) NULL,
  `supplement` TEXT NOT NULL,
  `amount` DOUBLE NOT NULL,
  `costPrice` DOUBLE NOT NULL,
  `markupFactor` DOUBLE NOT NULL DEFAULT 1.3,
  `taxAmount` DOUBLE NOT NULL DEFAULT 0,
  `serviceChargeAmount` DOUBLE NOT NULL DEFAULT 0,
  `hlsCommissionAmount` DOUBLE NOT NULL DEFAULT 0,
  `principalShare` DOUBLE NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'unresolved',
  `details` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PrincipalCredit`
  ADD CONSTRAINT `PrincipalCredit_principalId_fkey`
  FOREIGN KEY (`principalId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PrincipalCredit`
  ADD CONSTRAINT `PrincipalCredit_walletId_fkey`
  FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE `SupportTicket`;
