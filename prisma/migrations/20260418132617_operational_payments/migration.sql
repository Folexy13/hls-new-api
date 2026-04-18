-- CreateTable
CREATE TABLE `OperationalPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('wholesaler', 'delivery') NOT NULL,
    `status` ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
    `amount` DOUBLE NOT NULL,
    `payeeName` VARCHAR(191) NOT NULL,
    `payeeContact` TEXT NULL,
    `payeeAddress` TEXT NULL,
    `note` TEXT NULL,
    `quizCode` VARCHAR(191) NULL,
    `packId` VARCHAR(191) NULL,
    `principalId` INTEGER NULL,
    `makerId` INTEGER NOT NULL,
    `confirmedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OperationalPayment` ADD CONSTRAINT `OperationalPayment_principalId_fkey` FOREIGN KEY (`principalId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperationalPayment` ADD CONSTRAINT `OperationalPayment_makerId_fkey` FOREIGN KEY (`makerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperationalPayment` ADD CONSTRAINT `OperationalPayment_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
