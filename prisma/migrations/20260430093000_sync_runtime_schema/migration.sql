-- Add researcher pack item sourcing columns
ALTER TABLE `ResearcherPackItem`
    ADD COLUMN `dispatchedWithoutWholesaler` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `effectiveMarkupFactor` DOUBLE NOT NULL DEFAULT 1.3,
    ADD COLUMN `requiresReselection` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `selectedWholesalerAddress` VARCHAR(191) NULL,
    ADD COLUMN `selectedWholesalerContact` VARCHAR(191) NULL,
    ADD COLUMN `selectedWholesalerDetails` JSON NULL,
    ADD COLUMN `selectedWholesalerName` VARCHAR(191) NULL,
    ADD COLUMN `selectedWholesalerPrice` DOUBLE NULL;

-- Add withdrawal transfer tracking columns
ALTER TABLE `Withdrawal`
    ADD COLUMN `transferRecipientCode` VARCHAR(191) NULL,
    ADD COLUMN `transferReference` VARCHAR(191) NULL;

-- Convert legacy QuizCode text health fields into JSON-backed multi-value fields.
ALTER TABLE `QuizCode`
    ADD COLUMN `allergies_json` JSON NULL,
    ADD COLUMN `scares_json` JSON NULL,
    ADD COLUMN `familyCondition_json` JSON NULL,
    ADD COLUMN `medications_json` JSON NULL,
    ADD COLUMN `currentConditions` JSON NULL;

UPDATE `QuizCode`
SET
    `allergies_json` = CASE
        WHEN `allergies` IS NULL OR TRIM(`allergies`) = '' THEN NULL
        ELSE JSON_ARRAY(TRIM(`allergies`))
    END,
    `scares_json` = CASE
        WHEN `scares` IS NULL OR TRIM(`scares`) = '' THEN NULL
        WHEN LOCATE('| Current condition:', `scares`) > 0
            THEN JSON_ARRAY(TRIM(SUBSTRING_INDEX(`scares`, '| Current condition:', 1)))
        ELSE JSON_ARRAY(TRIM(`scares`))
    END,
    `familyCondition_json` = CASE
        WHEN `familyCondition` IS NULL OR TRIM(`familyCondition`) = '' THEN NULL
        ELSE JSON_ARRAY(TRIM(`familyCondition`))
    END,
    `medications_json` = CASE
        WHEN `medications` IS NULL OR TRIM(`medications`) = '' THEN NULL
        ELSE JSON_ARRAY(TRIM(`medications`))
    END,
    `currentConditions` = CASE
        WHEN `scares` IS NULL OR LOCATE('| Current condition:', `scares`) = 0 THEN NULL
        ELSE JSON_ARRAY(TRIM(SUBSTRING_INDEX(`scares`, '| Current condition:', -1)))
    END;

ALTER TABLE `QuizCode`
    DROP COLUMN `allergies`,
    DROP COLUMN `scares`,
    DROP COLUMN `familyCondition`,
    DROP COLUMN `medications`;

ALTER TABLE `QuizCode`
    CHANGE COLUMN `allergies_json` `allergies` JSON NULL,
    CHANGE COLUMN `scares_json` `scares` JSON NULL,
    CHANGE COLUMN `familyCondition_json` `familyCondition` JSON NULL,
    CHANGE COLUMN `medications_json` `medications` JSON NULL;

-- Add unresolved principal credit tracking
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
        FOREIGN KEY (`principalId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PrincipalCredit_walletId_fkey`
        FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
