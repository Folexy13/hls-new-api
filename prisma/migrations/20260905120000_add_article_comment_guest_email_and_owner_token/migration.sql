ALTER TABLE `ArticleComment`
  ADD COLUMN `guestEmail` VARCHAR(191) NULL,
  ADD COLUMN `ownerTokenHash` VARCHAR(64) NULL;

CREATE INDEX `ArticleComment_guestEmail_idx` ON `ArticleComment`(`guestEmail`);
