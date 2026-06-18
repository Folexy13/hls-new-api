ALTER TABLE `ArticleComment`
  DROP FOREIGN KEY `ArticleComment_userId_fkey`;

ALTER TABLE `ArticleComment`
  ADD COLUMN `guestName` TEXT NULL,
  MODIFY `userId` INTEGER NULL;

ALTER TABLE `ArticleComment`
  ADD CONSTRAINT `ArticleComment_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
