import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type {
  ApiGame,
  ApiGameCreate,
  ApiGameFinalize,
  ApiGameWithPlayers,
  ApiGameBuyInCreate,
} from "@poker-hub/db";

const QUERY_KEYS = {
  games: ["games"] as const,
  game: (id: string) => ["games", id] as const,
  history: (groupId?: string | null) =>
    ["history", groupId ?? "all"] as const,
};

export function useHistoryQuery(groupId?: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.history(groupId),
    queryFn: () => {
      const q =
        groupId !== undefined && groupId !== null && groupId !== ""
          ? `?groupId=${encodeURIComponent(groupId)}`
          : "";
      return api.get<ApiGameWithPlayers[]>(`/history${q}`);
    },
  });
}

export function useGameQuery(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.game(id ?? ""),
    queryFn: () => api.get<ApiGameWithPlayers>(`/games/${id}`),
    enabled: !!id,
  });
}

export function useCreateGameMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApiGameCreate) =>
      api.post<ApiGameWithPlayers>("/games", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.games });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useFinalizeGameMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, body }: { gameId: string; body: ApiGameFinalize }) =>
      api.patch<ApiGameWithPlayers>(`/games/${gameId}/finalize`, body),
    onSuccess: (data, { gameId }) => {
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.game(gameId) });
      qc.invalidateQueries({ queryKey: ["profit-loss"] });
      qc.invalidateQueries({
        queryKey: ["groups", data.groupId, "ledger"],
      });
      qc.invalidateQueries({ queryKey: ["groups", "ledger", "all"] });
    },
  });
}

export function useCreateBuyInMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      gameId,
      body,
    }: {
      gameId: string;
      body: ApiGameBuyInCreate;
    }) => api.post<{ ok: true }>(`/games/${gameId}/buy-ins`, body),
    onSuccess: (_, { gameId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.game(gameId) });
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["profit-loss"] });
    },
  });
}

export function useDeleteGameMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      gameId,
    }: {
      gameId: string;
      /** Used only for ledger cache invalidation in `onSuccess`. */
      groupId?: string | null;
    }) => api.delete<{ ok: true }>(`/games/${gameId}`),
    onSuccess: (_data, { gameId, groupId }) => {
      qc.removeQueries({ queryKey: QUERY_KEYS.game(gameId) });
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["profit-loss"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["locations"] });
      if (groupId) {
        qc.invalidateQueries({ queryKey: ["groups", groupId, "ledger"] });
      }
      qc.invalidateQueries({ queryKey: ["groups", "ledger", "all"] });
    },
  });
}
