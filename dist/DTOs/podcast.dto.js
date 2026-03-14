"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePodcastSchema = exports.CreatePodcastSchema = void 0;
const zod_1 = require("zod");
exports.CreatePodcastSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters'),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
});
exports.UpdatePodcastSchema = exports.CreatePodcastSchema.partial();
//# sourceMappingURL=podcast.dto.js.map