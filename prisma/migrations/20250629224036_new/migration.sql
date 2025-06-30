/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `userId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `NutrientType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `basicId` INTEGER NULL,
    `lifestyleId` INTEGER NULL,
    `preferenceId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NutrientType_userId_key`(`userId`),
    UNIQUE INDEX `NutrientType_basicId_key`(`basicId`),
    UNIQUE INDEX `NutrientType_lifestyleId_key`(`lifestyleId`),
    UNIQUE INDEX `NutrientType_preferenceId_key`(`preferenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Basic` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nutrientId` INTEGER NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `nickname` VARCHAR(191) NULL,
    `age` VARCHAR(191) NOT NULL,
    `weight` VARCHAR(191) NOT NULL,
    `height` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Basic_nutrientId_key`(`nutrientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lifestyle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nutrientId` INTEGER NOT NULL,
    `habit` VARCHAR(191) NOT NULL,
    `fun` VARCHAR(191) NOT NULL,
    `routine` VARCHAR(191) NOT NULL,
    `career` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lifestyle_nutrientId_key`(`nutrientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Preference` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nutrientId` INTEGER NOT NULL,
    `drugForm` VARCHAR(191) NOT NULL,
    `minBudget` DOUBLE NOT NULL,
    `maxBudget` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Preference_nutrientId_key`(`nutrientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_userId_key` ON `User`(`userId`);

-- AddForeignKey
ALTER TABLE `NutrientType` ADD CONSTRAINT `NutrientType_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Basic` ADD CONSTRAINT `Basic_nutrientId_fkey` FOREIGN KEY (`nutrientId`) REFERENCES `NutrientType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lifestyle` ADD CONSTRAINT `Lifestyle_nutrientId_fkey` FOREIGN KEY (`nutrientId`) REFERENCES `NutrientType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Preference` ADD CONSTRAINT `Preference_nutrientId_fkey` FOREIGN KEY (`nutrientId`) REFERENCES `NutrientType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
