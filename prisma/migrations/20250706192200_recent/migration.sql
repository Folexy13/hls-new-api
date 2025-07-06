-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('benfek', 'principal', 'pharmacy', 'researcher', 'wholesaler') NOT NULL DEFAULT 'benfek';
