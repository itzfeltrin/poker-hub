import { createFileRoute } from "@tanstack/react-router";
import { useGame, useFinalizeGame } from "../api/hooks";
import { formatCurrency, formatNumber } from "../utils/currency";
import { useState } from "react";
import * as R from "remeda";

export const Route = createFileRoute("/games/$id")({
  component: GameDetailPage,
});

function GameDetailPage() {
  const { id } = Route.useParams();
  const { data: game, isLoading, error } = useGame(id);
  const finalize = useFinalizeGame();
  const [chips, setChips] = useState<Record<string, string>>({});

  if (isLoading) return <p className="text-slate-500">Carregando…</p>;
  if (error || !game)
    return <p className="text-red-600">Partida não encontrada.</p>;

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed: Record<string, number> = {};
    for (const [playerId, value] of Object.entries(chips)) {
      const n = Number(value);
      if (Number.isNaN(n) || n < 0) return;
      parsed[playerId] = n;
    }
    if (Object.keys(parsed).length !== game.players.length) return;
    finalize.mutate({ id: game.id, final_chips: parsed });
  };

  const isFinished = game.finished;
  const totalChipsInPlay = game.players.length * game.chips_per_player;

  const sumFinalChips = R.sum(
    game.players.map((p) => Number(chips[p.player_id]) || 0),
  );

  const sumExceedsTotal = sumFinalChips > totalChipsInPlay;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Partida</h1>
      <p className="mt-1 text-slate-600">
        {new Date(game.date).toLocaleString("pt-BR")} — Buy-in{" "}
        {formatCurrency(game.buy_in)} · {formatNumber(game.chips_per_player)}{" "}
        fichas/jogador
      </p>
      <p className="mt-2">
        <span
          className={`inline rounded-full px-2 py-0.5 text-xs font-medium ${
            isFinished
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {isFinished ? "Finalizada" : "Em andamento"}
        </span>
      </p>

      <div className="mt-6">
        <p className="text-sm text-slate-600">
          {formatNumber(totalChipsInPlay)} fichas em jogo
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-800">Jogadores</h2>
        <ul className="mt-2 space-y-2">
          {game.players.map((player) => (
            <li
              key={player.player_id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <span className="font-medium">{player.name}</span>
              {isFinished ? (
                <span className="text-slate-600">
                  {formatNumber(player.final_chips ?? 0)} fichas
                </span>
              ) : (
                <input
                  type="number"
                  min="0"
                  placeholder="Fichas finais"
                  value={chips[player.player_id] ?? ""}
                  onChange={(e) =>
                    setChips((prev) => ({
                      ...prev,
                      [player.player_id]: e.target.value,
                    }))
                  }
                  className="no-spinner w-48 rounded border border-slate-300 px-2 py-1 text-right focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              )}
            </li>
          ))}
        </ul>

        {!isFinished && game.players.length > 0 && (
          <form onSubmit={handleFinalize} className="mt-4">
            {sumExceedsTotal && (
              <p className="mb-3 text-sm text-amber-600">
                A soma das fichas finais ({formatNumber(sumFinalChips)}) é maior
                que as fichas em jogo ({formatNumber(totalChipsInPlay)}).
              </p>
            )}
            <button
              type="submit"
              disabled={
                finalize.isPending ||
                sumExceedsTotal ||
                game.players.some((player) => {
                  const v = chips[player.player_id];
                  return v === undefined || v === "" || Number(v) < 0;
                })
              }
              className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {finalize.isPending ? "Finalizando…" : "Finalizar partida"}
            </button>
            {finalize.isError && (
              <p className="mt-2 text-sm text-red-600">
                {(finalize.error as Error).message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
