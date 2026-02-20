import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { usePlayers, useCreateGame } from "../api/hooks";
import { CurrencyInput } from "../components/CurrencyInput";
import { useState } from "react";

export const Route = createFileRoute("/games/")({
  component: GamesPage,
});

function GamesPage() {
  const navigate = useNavigate();
  const { data: playersList, isLoading: loadingPlayers } = usePlayers();
  const createGame = useCreateGame();
  const [buyIn, setBuyIn] = useState(0);
  const [chips, setChips] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chipsNum = Number(chips);
    if (!buyIn || buyIn <= 0 || !chipsNum || selectedIds.length === 0) return;
    createGame.mutate(
      { buy_in: buyIn, chips_per_player: chipsNum, player_ids: selectedIds },
      {
        onSuccess: (response) => {
          const game = response.data;
          setBuyIn(0);
          setChips("");
          setSelectedIds([]);
          navigate({ to: "/games/$id", params: { id: game.id } });
        },
      },
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Nova partida</h1>

      {loadingPlayers && (
        <p className="mt-4 text-slate-500">Carregando jogadores…</p>
      )}
      {playersList && playersList.length === 0 && (
        <p className="mt-4 text-amber-600">
          Cadastre jogadores antes de criar uma partida.
        </p>
      )}

      {playersList && playersList.length > 0 && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Buy-in
            </label>
            <CurrencyInput
              value={buyIn}
              onChange={setBuyIn}
              min={0.01}
              placeholder="0,00"
              className="mt-1 w-36 rounded-md border border-slate-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Fichas por jogador
            </label>
            <input
              type="number"
              min="1"
              value={chips}
              onChange={(e) => setChips(e.target.value)}
              className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Jogadores
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {playersList.map((player) => (
                <label
                  key={player.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 hover:bg-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(player.id)}
                    onChange={() => togglePlayer(player.id)}
                    className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <span>{player.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={createGame.isPending || selectedIds.length === 0}
            className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {createGame.isPending ? "Criando…" : "Iniciar partida"}
          </button>
          {createGame.isError && (
            <p className="text-sm text-red-600">
              {(createGame.error as Error).message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
