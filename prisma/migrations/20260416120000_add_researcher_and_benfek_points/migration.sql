-- AlterTable
ALTER TABLE `Supplement`
  ADD COLUMN `manufacturer` VARCHAR(191) NULL,
  ADD COLUMN `dosageForm` VARCHAR(191) NULL,
  ADD COLUMN `budgetRange` VARCHAR(191) NULL,
  ADD COLUMN `tags` JSON NULL,
  ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'in_stock';

-- CreateTable
CREATE TABLE `ResearcherPack` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `quizCode` VARCHAR(191) NOT NULL,
  `packId` VARCHAR(191) NOT NULL,
  `packName` VARCHAR(191) NOT NULL,
  `researcherId` INTEGER NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ResearcherPack_quizCode_packId_key`(`quizCode`, `packId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResearcherPackItem` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `packId` INTEGER NOT NULL,
  `supplementId` INTEGER NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ResearcherPackItem_packId_supplementId_key`(`packId`, `supplementId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BenfekGamePoint` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NULL,
  `quizCode` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `points` INTEGER NOT NULL DEFAULT 0,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BenfekGamePoint_userId_key`(`userId`),
  UNIQUE INDEX `BenfekGamePoint_quizCode_key`(`quizCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ResearcherPack`
  ADD CONSTRAINT `ResearcherPack_researcherId_fkey`
  FOREIGN KEY (`researcherId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResearcherPackItem`
  ADD CONSTRAINT `ResearcherPackItem_packId_fkey`
  FOREIGN KEY (`packId`) REFERENCES `ResearcherPack`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResearcherPackItem`
  ADD CONSTRAINT `ResearcherPackItem_supplementId_fkey`
  FOREIGN KEY (`supplementId`) REFERENCES `Supplement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BenfekGamePoint`
  ADD CONSTRAINT `BenfekGamePoint_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
