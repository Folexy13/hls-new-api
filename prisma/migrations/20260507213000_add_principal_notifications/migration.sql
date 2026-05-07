CREATE TABLE `PrincipalNotification` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `sourceKey` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `href` TEXT NULL,
  `count` INTEGER NOT NULL DEFAULT 1,
  `fingerprint` TEXT NOT NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `isDeleted` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PrincipalNotification_userId_sourceKey_key`(`userId`, `sourceKey`),
  INDEX `PrincipalNotification_userId_isRead_isDeleted_idx`(`userId`, `isRead`, `isDeleted`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PrincipalNotification`
  ADD CONSTRAINT `PrincipalNotification_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
