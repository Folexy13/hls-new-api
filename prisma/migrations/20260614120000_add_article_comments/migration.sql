CREATE TABLE `ArticleComment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `body` TEXT NOT NULL,
  `articleId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  `parentId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX `ArticleComment_articleId_idx`(`articleId`),
  INDEX `ArticleComment_userId_idx`(`userId`),
  INDEX `ArticleComment_parentId_idx`(`parentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ArticleComment`
  ADD CONSTRAINT `ArticleComment_articleId_fkey`
  FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ArticleComment`
  ADD CONSTRAINT `ArticleComment_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ArticleComment`
  ADD CONSTRAINT `ArticleComment_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `ArticleComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
