import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { ApiGame, ApiProfitLossResponse } from "./types";

const QUERY_KEYS = {
  players: ["players"] as const,
  games: ["games"] as const,
  game: (id: string) => ["games", id] as const,
  history: ["history"] as const,
  profitLoss: (params: { period?: string; start_date?: string; end_date?: string }) =>
    ["profit-loss", params] as const,
};

export function usePlayersQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.players,
    queryFn: () => api.get<{ id: string; name: string }[]>("/players"),
  });
}

export function useCreatePlayerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<{ id: string; name: string }>("/players", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.players }),
  });
}

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
    mutationFn: (body: {
      buy_in: number;
      chips_per_player: number;
      player_ids: string[];
    }) => api.post<ApiGame>("/games", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.history });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.games });
    },
  });
}

export function useFinalizeGameMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      gameId,
      final_chips,
    }: {
      gameId: string;
      final_chips: Record<string, number>;
    }) => api.patch<ApiGame>(`/games/${gameId}/finalize`, { final_chips }),
    onSuccess: (_, { gameId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.history });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.game(gameId) });
      qc.invalidateQueries({ queryKey: ["profit-loss"] });
    },
  });
}

export function useProfitLossQuery(params?: {
  period?: string;
  start_date?: string;
  end_date?: string;
}) {
  const search = new URLSearchParams();
  if (params?.period) search.set("period", params.period);
  if (params?.start_date) search.set("start_date", params.start_date);
  if (params?.end_date) search.set("end_date", params.end_date);
  const query = search.toString();
  return useQuery({
    queryKey: QUERY_KEYS.profitLoss(params ?? {}),
    queryFn: () =>
      api.get<ApiProfitLossResponse>(
        "/profit-loss" + (query ? `?${query}` : "")
      ),
  });
}
