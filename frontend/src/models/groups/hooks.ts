import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiGroup, ApiGroupMember } from "@poker-hub/db";

export type GroupWithGameCount = {
  id: string;
  name: string;
  gameCount: number;
};

const QUERY_KEYS = {
  groups: ["groups"] as const,
  group: (id: string) => ["groups", id] as const,
  groupMembers: (groupId: string) => ["groups", groupId, "members"] as const,
};

export function useGroupsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.groups,
    queryFn: () => api.get<GroupWithGameCount[]>("/groups"),
  });
}

export function useGroupMembersQuery(groupId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.groupMembers(groupId ?? ""),
    queryFn: () => api.get<ApiGroupMember[]>(`/groups/${groupId}/members`),
    enabled: !!groupId,
  });
}

export function useGroupQuery(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.group(id ?? ""),
    queryFn: () => api.get<ApiGroup>(`/groups/${id}`),
    enabled: !!id,
  });
}

export function useCreateGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) =>
      api.post<ApiGroup>("/groups", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.groups });
    },
  });
}

export function useUpdateGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string } }) =>
      api.patch<ApiGroup>(`/groups/${id}`, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.group(id) });
    },
  });
}

export function useDeleteGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/groups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.groups });
    },
  });
}

export function useAddGroupMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      playerId,
    }: {
      groupId: string;
      playerId: string;
    }) =>
      api.post<ApiGroupMember>(`/groups/${groupId}/members`, { playerId }),
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.groupMembers(groupId) });
    },
  });
}
