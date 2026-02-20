import { createContext, useContext, useState, ReactNode } from "react";

export interface Player {
  id: string;
  name: string;
  avatar: string;
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
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  addGame: (game: Omit<Game, "id">) => void;
  getPlayerById: (id: string) => Player | undefined;
  getPlayerPnL: (playerId: string) => number;
  getPlayerGamesCount: (playerId: string) => number;
}

const PokerContext = createContext<PokerContextType | undefined>(undefined);

const AVATARS = ["♠", "♥", "♦", "♣", "👑", "🎯", "🔥", "⭐"];

const defaultPlayers: Player[] = [
  { id: "1", name: "Alex", avatar: "♠", createdAt: "2024-01-15" },
  { id: "2", name: "Jordan", avatar: "♥", createdAt: "2024-01-15" },
  { id: "3", name: "Sam", avatar: "♦", createdAt: "2024-02-01" },
  { id: "4", name: "Casey", avatar: "♣", createdAt: "2024-02-01" },
];

const defaultGames: Game[] = [
  {
    id: "g1",
    date: "2024-12-20",
    location: "Alex's Place",
    players: [
      { playerId: "1", buyIn: 50, cashOut: 120 },
      { playerId: "2", buyIn: 50, cashOut: 30 },
      { playerId: "3", buyIn: 50, cashOut: 40 },
      { playerId: "4", buyIn: 50, cashOut: 10 },
    ],
  },
  {
    id: "g2",
    date: "2025-01-05",
    location: "The Garage",
    players: [
      { playerId: "1", buyIn: 100, cashOut: 60 },
      { playerId: "2", buyIn: 100, cashOut: 180 },
      { playerId: "3", buyIn: 100, cashOut: 80 },
      { playerId: "4", buyIn: 100, cashOut: 80 },
    ],
  },
  {
    id: "g3",
    date: "2025-01-18",
    location: "Sam's Basement",
    players: [
      { playerId: "1", buyIn: 75, cashOut: 90 },
      { playerId: "2", buyIn: 75, cashOut: 50 },
      { playerId: "3", buyIn: 75, cashOut: 130 },
      { playerId: "4", buyIn: 75, cashOut: 30 },
    ],
  },
];

export function PokerProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>(defaultPlayers);
  const [games, setGames] = useState<Game[]>(defaultGames);

  const addPlayer = (name: string) => {
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      avatar: AVATARS[players.length % AVATARS.length],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setPlayers((prev) => [...prev, newPlayer]);
  };

  const removePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const addGame = (game: Omit<Game, "id">) => {
    setGames((prev) => [...prev, { ...game, id: crypto.randomUUID() }]);
  };

  const getPlayerById = (id: string) => players.find((p) => p.id === id);

  const getPlayerPnL = (playerId: string) => {
    return games.reduce((total, game) => {
      const entry = game.players.find((p) => p.playerId === playerId);
      if (!entry) return total;
      return total + (entry.cashOut - entry.buyIn);
    }, 0);
  };

  const getPlayerGamesCount = (playerId: string) => {
    return games.filter((g) => g.players.some((p) => p.playerId === playerId)).length;
  };

  return (
    <PokerContext.Provider
      value={{ players, games, addPlayer, removePlayer, addGame, getPlayerById, getPlayerPnL, getPlayerGamesCount }}
    >
      {children}
    </PokerContext.Provider>
  );
}

export function usePoker() {
  const context = useContext(PokerContext);
  if (!context) throw new Error("usePoker must be used within PokerProvider");
  return context;
}
