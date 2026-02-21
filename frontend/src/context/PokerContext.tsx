import { createContext, useContext, useMemo, ReactNode } from "react";
import {
  usePlayersQuery,
  useCreatePlayerMutation,
  useHistoryQuery,
  useProfitLossQuery,
  useCreateGameMutation,
  useFinalizeGameMutation,
} from "@/api/hooks";
import type { ApiGame, ApiGamePlayer } from "@/api/types";

export interface Player {
  id: string;
  name: string;
  createdAt: string;
}

export interface GamePlayer {
  playerId: string;
  buyIn: number;
  cashOut: number;
}

export interface Game {
  id: string;
  date: string;
  location: string;
  players: GamePlayer[];
  notes?: string;
}

interface PokerContextType {
  players: Player[];
  games: Game[];
  isLoading: boolean;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  addGame: (
    game: Omit<Game, "id"> & { buyIn?: number; chipsPerPlayer?: number },
  ) => Promise<void>;
  getPlayerById: (id: string) => Player | undefined;
  getPlayerPnL: (playerId: string) => number;
  getPlayerGamesCount: (playerId: string) => number;
}

const PokerContext = createContext<PokerContextType | undefined>(undefined);

function apiGameToUiGame(g: ApiGame): Game {
  return {
    id: g.id,
    date: g.date,
    location: "—", // not from API, leave placeholder
    players: g.players.map((p: ApiGamePlayer) => ({
      playerId: p.player_id,
      buyIn: g.buy_in,
      cashOut: (p.final_chips / g.chips_per_player) * g.buy_in,
    })),
  };
}

function apiPlayersToUiPlayers(
  apiPlayers: { id: string; name: string }[] | undefined,
): Player[] {
  if (!apiPlayers) return [];
  return apiPlayers.map((p, i) => ({
    id: p.id,
    name: p.name,
    createdAt: "", // not from API, leave empty
  }));
}

export function PokerProvider({ children }: { children: ReactNode }) {
  const { data: apiPlayers, isLoading: playersLoading } = usePlayersQuery();
  const { data: historyGames, isLoading: historyLoading } = useHistoryQuery();
  const { data: profitLoss } = useProfitLossQuery({ period: "all_time" });
  const createPlayerMut = useCreatePlayerMutation();
  const createGameMut = useCreateGameMutation();
  const finalizeGameMut = useFinalizeGameMutation();

  const players = useMemo(
    () => apiPlayersToUiPlayers(apiPlayers),
    [apiPlayers],
  );
  const games = useMemo(
    () => (historyGames ?? []).map(apiGameToUiGame),
    [historyGames],
  );

  const pnlByPlayerId = useMemo(() => {
    const map = new Map<string, number>();
    profitLoss?.players?.forEach((p) => map.set(p.player_id, p.profit_loss));
    return map;
  }, [profitLoss]);

  const gamesCountByPlayerId = useMemo(() => {
    const map = new Map<string, number>();
    games.forEach((g) => {
      g.players.forEach((gp) => {
        map.set(gp.playerId, (map.get(gp.playerId) ?? 0) + 1);
      });
    });
    return map;
  }, [games]);

  const addPlayer = (name: string) => {
    createPlayerMut.mutate(name);
  };

  const removePlayer = (_id: string) => {
    // No delete player endpoint on backend; leave as no-op
  };

  const addGame = (game: Omit<Game, "id">): Promise<void> => {
    const playerIds = game.players.map((p) => p.playerId);
    const buyIn =
      game.players.length > 0
        ? game.players.reduce((s, p) => s + p.buyIn, 0) / game.players.length
        : 0;
    const chipsPerPlayer = Math.max(1, Math.round(buyIn));
    const buyInValue = Math.max(0.01, buyIn || 1);
    return new Promise((resolve, reject) => {
      createGameMut.mutate(
        {
          buy_in: buyInValue,
          chips_per_player: chipsPerPlayer,
          player_ids: playerIds,
        },
        {
          onSuccess: (created) => {
            const final_chips: Record<string, number> = {};
            game.players.forEach((p) => {
              final_chips[p.playerId] = p.cashOut;
            });
            finalizeGameMut.mutate(
              { gameId: created.id, final_chips },
              {
                onSuccess: () => resolve(),
                onError: (err) => reject(err),
              },
            );
          },
          onError: (err) => reject(err),
        },
      );
    });
  };

  const getPlayerById = (id: string) => players.find((p) => p.id === id);
  const getPlayerPnL = (playerId: string) => pnlByPlayerId.get(playerId) ?? 0;
  const getPlayerGamesCount = (playerId: string) =>
    gamesCountByPlayerId.get(playerId) ?? 0;

  const value: PokerContextType = useMemo(
    () => ({
      players,
      games,
      isLoading: playersLoading || historyLoading,
      addPlayer,
      removePlayer,
      addGame,
      getPlayerById,
      getPlayerPnL,
      getPlayerGamesCount,
    }),
    [
      players,
      games,
      playersLoading,
      historyLoading,
      addPlayer,
      addGame,
      getPlayerById,
      getPlayerPnL,
      getPlayerGamesCount,
    ],
  );

  return (
    <PokerContext.Provider value={value}>{children}</PokerContext.Provider>
  );
}

export function usePoker() {
  const context = useContext(PokerContext);
  if (!context) throw new Error("usePoker must be used within PokerProvider");
  return context;
}
