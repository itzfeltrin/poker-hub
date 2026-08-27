import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type {
  ApiGameCreate,
  ApiGameFinalize,
  ApiGameWithPlayers,
  ApiGameBuyInCreate,
  ApiGameSpeechParseResponse,
  ApiGameSpeechStatus,
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

export function useSpeechStatusQuery() {
  return useQuery({
    queryKey: ["games", "speech-status"] as const,
    queryFn: () => api.get<ApiGameSpeechStatus>("/games/parse-speech"),
    staleTime: 60_000,
  });
}

export function useParseGameSpeechMutation() {
  return useMutation({
    mutationFn: (audio: Blob) => {
      const form = new FormData();
      const type = audio.type || "audio/webm";
      const ext = type.includes("mp4")
        ? "mp4"
        : type.includes("ogg")
          ? "ogg"
          : "webm";
      form.append("audio", audio, `recording.${ext}`);
      return api.postForm<ApiGameSpeechParseResponse>(
        "/games/parse-speech",
        form,
      );
    },
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
