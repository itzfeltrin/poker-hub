import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiPlayer, ApiPlayerCreate } from "@shared/models/players/types";

const QUERY_KEYS = {
  players: ["players"] as const,
};

export function usePlayersQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.players,
    queryFn: () => api.get<ApiPlayer[]>("/players"),
  });
}

export function useCreatePlayerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApiPlayerCreate) =>
      api.post<ApiPlayer>("/players", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.players }),
  });
}
