import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type {
  ApiGame,
  ApiGameCreate,
  ApiGameFinalize,
} from "@shared/models/games/types";

const QUERY_KEYS = {
  games: ["games"] as const,
  game: (id: string) => ["games", id] as const,
  history: ["history"] as const,
};

export function useHistoryQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.history,
    queryFn: () => api.get<ApiGame[]>("/history"),
  });
}

export function useGameQuery(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.game(id ?? ""),
    queryFn: () => api.get<ApiGame>(`/games/${id}`),
    enabled: !!id,
  });
}

export function useCreateGameMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApiGameCreate) => api.post<ApiGame>("/games", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.history });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.games });
    },
  });
}

export function useFinalizeGameMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, body }: { gameId: string; body: ApiGameFinalize }) =>
      api.patch<ApiGame>(`/games/${gameId}/finalize`, body),
    onSuccess: (_, { gameId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.history });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.game(gameId) });
      qc.invalidateQueries({ queryKey: ["profit-loss"] });
    },
  });
}
