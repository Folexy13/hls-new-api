-- Add benfekAge and benfekGender as nullable first
ALTER TABLE `QuizCode`
  ADD COLUMN `benfekAge` VARCHAR(191) NULL,
  ADD COLUMN `benfekGender` VARCHAR(191) NULL;

-- Backfill existing rows
UPDATE `QuizCode`
SET `benfekAge` = 'unknown',
    `benfekGender` = 'unknown'
WHERE `benfekAge` IS NULL
   OR `benfekGender` IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE `QuizCode`
  MODIFY `benfekAge` VARCHAR(191) NOT NULL,
  MODIFY `benfekGender` VARCHAR(191) NOT NULL;

-- Enforce unique phone numbers (multiple NULLs are allowed in MySQL)
ALTER TABLE `User`
  ADD UNIQUE INDEX `User_phone_key`(`phone`);
