import { z } from "zod";

export const ApiGroupSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export type ApiGroup = z.infer<typeof ApiGroupSchema>;

export const ApiGroupCreateSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1),
});

export type ApiGroupCreate = z.infer<typeof ApiGroupCreateSchema>;

export const ApiGroupPatchSchema = z.object({
  name: z.string().min(1).max(100),
});

export type ApiGroupPatch = z.infer<typeof ApiGroupPatchSchema>;

export const ApiGroupMemberSchema = z.object({
  id: z.uuid(),
  groupId: z.uuid(),
  playerId: z.uuid(),
  name: z.string(),
});

export type ApiGroupMember = z.infer<typeof ApiGroupMemberSchema>;
