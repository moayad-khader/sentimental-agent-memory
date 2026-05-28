import { z } from "zod";

export const EntityTypeSchema = z.string();

export const UserNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const EntityNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: EntityTypeSchema,
  aliases: z.array(z.string()).default([]),
});

export const EpisodeNodeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  source: z.string(),
});
