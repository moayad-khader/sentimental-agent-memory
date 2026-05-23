import type { z } from "zod";
import type { EntityTypeSchema, UserNodeSchema, EntityNodeSchema } from "@/modules/memory/domain/schema/nodes";

export type EntityType = z.infer<typeof EntityTypeSchema>;
export type UserNode = z.infer<typeof UserNodeSchema>;
export type EntityNode = z.infer<typeof EntityNodeSchema>;
