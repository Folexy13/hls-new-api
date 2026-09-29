ALTER TABLE `Supplement` DROP FOREIGN KEY `Supplement_userId_fkey`;
ALTER TABLE `Order` DROP FOREIGN KEY `Order_userId_fkey`;
ALTER TABLE `Payment` DROP FOREIGN KEY `Payment_userId_fkey`;
ALTER TABLE `Withdrawal` DROP FOREIGN KEY `Withdrawal_userId_fkey`;
ALTER TABLE `Withdrawal` DROP FOREIGN KEY `Withdrawal_walletId_fkey`;
ALTER TABLE `PrincipalCredit` DROP FOREIGN KEY `PrincipalCredit_principalId_fkey`;
ALTER TABLE `PrincipalCredit` DROP FOREIGN KEY `PrincipalCredit_walletId_fkey`;

ALTER TABLE `Supplement` MODIFY `userId` INTEGER NULL;
ALTER TABLE `Order` MODIFY `userId` INTEGER NULL;
ALTER TABLE `Payment` MODIFY `userId` INTEGER NULL;
ALTER TABLE `Withdrawal` MODIFY `userId` INTEGER NULL;
ALTER TABLE `Withdrawal` MODIFY `walletId` INTEGER NULL;
ALTER TABLE `PrincipalCredit` MODIFY `principalId` INTEGER NULL;
ALTER TABLE `PrincipalCredit` MODIFY `walletId` INTEGER NULL;

ALTER TABLE `Supplement`
  ADD CONSTRAINT `Supplement_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Order`
  ADD CONSTRAINT `Order_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Payment`
  ADD CONSTRAINT `Payment_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Withdrawal`
  ADD CONSTRAINT `Withdrawal_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Withdrawal`
  ADD CONSTRAINT `Withdrawal_walletId_fkey`
  FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PrincipalCredit`
  ADD CONSTRAINT `PrincipalCredit_principalId_fkey`
  FOREIGN KEY (`principalId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PrincipalCredit`
  ADD CONSTRAINT `PrincipalCredit_walletId_fkey`
  FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
