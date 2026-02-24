import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useGameQuery } from "@/models/games/hooks";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinalizeGameDialog } from "@/components/FinalizeGameDialog";
/** Position a seat around an ellipse. angle in radians, 0 = top. */
function seatPosition(
  index: number,
  total: number,
  radiusX: number,
  radiusY: number,
) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    x: 50 + (radiusX * Math.cos(angle)),
    y: 50 + (radiusY * Math.sin(angle)),
  };
}

export default function GameDetailsPage() {
  const { gameId } = useParams({ from: "/games/$gameId" });
  const { data: game, isLoading, error } = useGameQuery(gameId);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando partida...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="space-y-4 pb-20 md:pb-0">
        <p className="text-destructive">Partida não encontrada.</p>
        <Button asChild variant="outline">
          <Link to="/history">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao histórico
          </Link>
        </Button>
      </div>
    );
  }

  const totalPot = game.buy_in * game.players.length;
  const radiusX = 42;
  const radiusY = 38;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/history">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Histórico
          </Link>
        </Button>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{formatDate(game.date)}</p>
          <p className="font-display font-semibold">{game.location ?? "—"}</p>
        </div>
      </div>

      {/* Poker table: oval seen from above */}
      <div className="relative mx-auto max-w-2xl">
        <div
          className="relative w-full overflow-visible"
          style={{ paddingBottom: "75%" }}
        >
          {/* Table felt (oval) */}
          <div
            className="absolute inset-0 rounded-[50%] border-[12px] shadow-2xl"
            style={{
              background: "hsl(var(--felt))",
              borderColor: "hsl(30 25% 12%)",
              boxShadow:
                "inset 0 0 80px rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.4)",
            }}
          />

          {/* Pot in center */}
          <div
            className="absolute left-1/2 top-1/2 flex min-w-[80px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-xl border-2 border-amber-900/50 bg-amber-950/80 px-4 py-2 shadow-lg"
            style={{
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.3)",
            }}
          >
            <span className="text-[10px] uppercase tracking-wider text-amber-200/80">
              Pote
            </span>
            <span className="font-display text-lg font-bold text-amber-100">
              {formatCurrency(totalPot)}
            </span>
          </div>

          {/* Player seats around the table */}
          {game.players.map((player, index) => {
            const { x, y } = seatPosition(
              index,
              game.players.length,
              radiusX,
              radiusY,
            );
            const chips =
              player.final_chips != null
                ? player.final_chips
                : player.initial_chips;
            const chipValue =
              game.chips_per_player > 0
                ? (chips / game.chips_per_player) * game.buy_in
                : 0;

            return (
              <div
                key={player.player_id}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Chip stack indicator */}
                <div
                  className="mb-1 flex h-12 w-14 flex-col items-center justify-center rounded-lg border border-amber-800/60 bg-amber-950/90 shadow-md"
                  title={`${chips} fichas · ${formatCurrency(chipValue)}`}
                >
                  <span className="text-[10px] text-amber-200/90">
                    {chips} f
                  </span>
                  <span className="text-xs font-semibold text-amber-100">
                    {formatCurrency(chipValue)}
                  </span>
                </div>
                {/* Seat / player */}
                <div className="flex h-20 w-24 flex-col items-center justify-center rounded-xl border-2 border-border bg-card/95 py-2 shadow-lg">
                  <PlayerAvatar name={player.name} size="md" />
                  <span className="mt-1 w-full truncate px-1 text-center text-sm font-medium">
                    {player.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary below table */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <span>Buy-in: {formatCurrency(game.buy_in)}</span>
        <span>·</span>
        <span>{game.chips_per_player} fichas/jogador</span>
        {game.finished && (
          <>
            <span>·</span>
            <span className="text-primary">Finalizada</span>
          </>
        )}
      </div>

      {!game.finished && (
        <div className="flex justify-center">
          <Button
            onClick={() => setFinalizeOpen(true)}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Finalizar partida
          </Button>
        </div>
      )}

      {!game.finished && gameId && (
        <FinalizeGameDialog
          open={finalizeOpen}
          onOpenChange={setFinalizeOpen}
          gameId={gameId}
          game={game}
        />
      )}
    </div>
  );
}
