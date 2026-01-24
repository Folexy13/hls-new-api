-- CreateTable
CREATE TABLE `QuizCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `usedBy` INTEGER NULL,
    `usedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdBy` INTEGER NOT NULL,
    `benfekName` VARCHAR(191) NOT NULL,
    `benfekPhone` VARCHAR(191) NOT NULL,
    `allergies` TEXT NULL,
    `scares` TEXT NULL,
    `familyCondition` TEXT NULL,
    `medications` TEXT NULL,
    `hasCurrentCondition` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QuizCode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuizCode` ADD CONSTRAINT `QuizCode_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
