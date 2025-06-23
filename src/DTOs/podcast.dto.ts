import { z } from 'zod';

export const CreatePodcastSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

export const UpdatePodcastSchema = CreatePodcastSchema.partial();

export type CreatePodcastDTO = z.infer<typeof CreatePodcastSchema>;
export type UpdatePodcastDTO = z.infer<typeof UpdatePodcastSchema>;
