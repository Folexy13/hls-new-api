-- AlterTable
ALTER TABLE `Supplement` ADD COLUMN `wholesalers` JSON NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `researcherType` ENUM('maker', 'checker') NULL;
