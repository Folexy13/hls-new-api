ALTER TABLE `Payment`
  ADD COLUMN `paystackTransactionId` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `Payment_paystackTransactionId_key`(`paystackTransactionId`);
