-- Add username and quiz answer fields safely

-- 1) Add username as nullable first
ALTER TABLE `User`
  ADD COLUMN `username` VARCHAR(191) NULL;

-- 2) Backfill username for existing users (use email as fallback)
UPDATE `User`
SET `username` = `email`
WHERE `username` IS NULL;

-- 3) Enforce NOT NULL and unique on username
ALTER TABLE `User`
  MODIFY `username` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);

-- 4) Add quiz answer fields to QuizCode (nullable)
ALTER TABLE `QuizCode`
  ADD COLUMN `basicNickname` TEXT NULL,
  ADD COLUMN `basicWeight` TEXT NULL,
  ADD COLUMN `basicHeight` TEXT NULL,
  ADD COLUMN `lifestyleHabits` TEXT NULL,
  ADD COLUMN `lifestyleFun` TEXT NULL,
  ADD COLUMN `lifestylePriority` TEXT NULL,
  ADD COLUMN `preferenceDrugForm` TEXT NULL,
  ADD COLUMN `preferenceBudget` DOUBLE NULL;
