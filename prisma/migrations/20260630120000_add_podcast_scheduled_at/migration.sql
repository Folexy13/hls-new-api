ALTER TABLE `Podcast` ADD COLUMN `scheduledAt` DATETIME(3) NULL;

CREATE INDEX `Podcast_status_scheduledAt_idx` ON `Podcast`(`status`, `scheduledAt`);
