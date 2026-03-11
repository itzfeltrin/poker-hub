import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiLocation } from "@poker-hub/db";

export type LocationWithGameCount = {
  id: string;
  name: string;
  gameCount: number;
};

const QUERY_KEYS = {
  locations: ["locations"] as const,
  location: (id: string) => ["locations", id] as const,
};

export function useLocationsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.locations,
    queryFn: () => api.get<LocationWithGameCount[]>("/locations"),
  });
}

export function useLocationQuery(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.location(id),
    queryFn: () => api.get<ApiLocation>(`/locations/${id}`),
    enabled: !!id,
  });
}

export function useCreateLocationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) =>
      api.post<ApiLocation>("/locations", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.locations }),
  });
}

export function useUpdateLocationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string } }) =>
      api.patch<ApiLocation>(`/locations/${id}`, body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.locations });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.location(variables.id) });
    },
  });
}

export function useDeleteLocationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/locations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.locations }),
  });
}
