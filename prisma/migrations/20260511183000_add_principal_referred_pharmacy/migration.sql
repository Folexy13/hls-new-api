ALTER TABLE `User`
  ADD COLUMN `referPharmacy` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `referredPharmacyName` TEXT NULL,
  ADD COLUMN `referredPharmacyPhone` TEXT NULL;
