import type { z } from "zod";
import type { EntityTypeSchema, UserNodeSchema, EntityNodeSchema } from "@/schema/nodes.js";

export type EntityType = z.infer<typeof EntityTypeSchema>;
export type UserNode = z.infer<typeof UserNodeSchema>;
export type EntityNode = z.infer<typeof EntityNodeSchema>;
