/*
  Warnings:

  - You are about to drop the column `transaction` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paystackReference]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - The required column `orderNumber` was added to the `Order` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE `CartItem` ADD COLUMN `priceAtAdd` DOUBLE NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `orderNumber` VARCHAR(191) NOT NULL,
    ADD COLUMN `shippingAddress` TEXT NULL;

-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `productName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Payment` DROP COLUMN `transaction`,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
    ADD COLUMN `metadata` TEXT NULL,
    ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `paystackChannel` VARCHAR(191) NULL,
    ADD COLUMN `paystackReference` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Supplement` ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `imageUrl` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Order_orderNumber_key` ON `Order`(`orderNumber`);

-- CreateIndex
CREATE UNIQUE INDEX `Payment_paystackReference_key` ON `Payment`(`paystackReference`);
