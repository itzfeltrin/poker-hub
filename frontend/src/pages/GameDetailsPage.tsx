import { useState } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import {
  useCreateBuyInMutation,
  useDeleteGameMutation,
  useGameQuery,
} from "@/models/games/hooks";
import { useLocationsQuery, useGroupsQuery } from "@/api/hooks";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ArrowLeft, CheckCircle, PlusCircle, Banknote, Trash2 } from "lucide-react";
import { Button } from "@poker-hub/design-system";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FinalizeGameDialog } from "@/components/FinalizeGameDialog";
import { SettlementDialog } from "@/components/SettlementDialog";
import { toast } from "sonner";
/** Position a seat around an ellipse. angle in radians, 0 = top. */
function seatPosition(
  index: number,
  total: number,
  radiusX: number,
  radiusY: number,
) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    x: 50 + radiusX * Math.cos(angle),
    y: 50 + radiusY * Math.sin(angle),
  };
}

export default function GameDetailsPage() {
  const { gameId } = useParams({ from: "/games/$gameId" });
  const navigate = useNavigate();
  const { data: game, isLoading, error } = useGameQuery(gameId);
  const { data: locations = [] } = useLocationsQuery();
  const { data: groups = [] } = useGroupsQuery();
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const createBuyInMut = useCreateBuyInMutation();
  const deleteGameMut = useDeleteGameMutation();

  const locationName = game?.locationId
    ? locations.find((l) => l.id === game.locationId)?.name ?? "—"
    : "—";

  const groupName = game?.groupId
    ? groups.find((g) => g.id === game.groupId)?.name ?? "—"
    : "—";

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

  const totalInitialChips = game.players.reduce(
    (sum, p) => sum + p.initialChips,
    0,
  );
  const totalPot =
    game.chipsPerPlayer > 0
      ? (totalInitialChips / game.chipsPerPlayer) * game.buyIn
      : game.buyIn * game.players.length;
  const radiusX = 42;
  const radiusY = 38;

  const handleDeleteGame = async () => {
    if (!gameId || !game) return;
    try {
      await deleteGameMut.mutateAsync({ gameId, groupId: game.groupId });
      toast.success("Partida removida do histórico e dos saldos.");
      navigate({ to: "/history" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir partida");
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 md:h-9 md:px-3"
        >
          <Link to="/history">
            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
            <span className="text-xs md:text-sm">Histórico</span>
          </Link>
        </Button>
        <div className="flex items-start gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="shrink-0 h-8 md:h-9"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="ml-1.5 hidden sm:inline text-xs md:text-sm">Excluir</span>
          </Button>
          <div className="text-right">
            <p className="text-xs text-muted-foreground md:text-sm">
              {formatDate(game.date)}
            </p>
            <p className="font-display text-sm font-semibold md:text-base">
              {locationName}
            </p>
            <p className="text-xs text-muted-foreground md:text-sm">{groupName}</p>
          </div>
        </div>
      </div>

      {/* Poker table: oval seen from above */}
      <div className="relative mx-auto max-w-sm md:max-w-2xl">
        <div
          className="relative w-full overflow-visible"
          style={{ paddingBottom: "75%" }}
        >
          {/* Table felt (oval) */}
          <div
            className="absolute inset-0 rounded-[50%] border-8 shadow-2xl md:border-[12px]"
            style={{
              background: "hsl(var(--felt))",
              borderColor: "hsl(30 25% 12%)",
              boxShadow:
                "inset 0 0 80px rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.4)",
            }}
          />

          {/* Pot in center */}
          <div
            className="absolute left-1/2 top-1/2 flex min-w-[56px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border-2 border-amber-900/50 bg-amber-950/80 px-2 py-1 shadow-lg md:min-w-[80px] md:rounded-xl md:px-4 md:py-2"
            style={{
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.3)",
            }}
          >
            <span className="text-[8px] uppercase tracking-wider text-amber-200/80 md:text-[10px]">
              Pote
            </span>
            <span className="font-display text-sm font-bold text-amber-100 md:text-lg">
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
              player.cashOut != null ? player.cashOut : player.initialChips;
            const chipValue =
              game.chipsPerPlayer > 0
                ? (chips / game.chipsPerPlayer) * game.buyIn
                : 0;
            const initialValue =
              game.chipsPerPlayer > 0
                ? (player.initialChips / game.chipsPerPlayer) * game.buyIn
                : 0;
            const pnl = chipValue - initialValue;
            const pnlClass =
              pnl > 0
                ? "text-success"
                : pnl < 0
                  ? "text-loss"
                  : "text-amber-100";

            return (
              <div
                key={player.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Chip stack indicator */}
                <div
                  className="mb-0.5 flex h-9 w-10 flex-col items-center justify-center rounded border border-amber-800/60 bg-amber-950/90 p-0.5 shadow-md md:mb-1 md:h-12 md:w-14 md:rounded-lg md:p-1 md:px-2"
                  title={`${chips} fichas · ${formatCurrency(chipValue)}`}
                >
                  <span className="text-[8px] text-amber-200/90 md:text-[10px]">
                    {chips} f
                  </span>
                  <span
                    className={`text-[10px] font-semibold md:text-xs ${pnlClass}`}
                  >
                    {formatCurrency(chipValue)}
                  </span>
                </div>
                {/* Seat / player */}
                <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg border-2 border-border bg-card/95 py-1 shadow-lg md:h-20 md:w-24 md:rounded-xl md:py-2">
                  <PlayerAvatar
                    name={player.name}
                    size="xs"
                    className="sm:size-10 sm:text-lg"
                  />
                  <span className="mt-0.5 w-full truncate px-0.5 text-center text-xs font-medium md:mt-1 md:px-1 md:text-sm">
                    {player.name}
                  </span>
                </div>
                {!game.finished && gameId && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="mt-1 h-7 w-7 rounded-full bg-background/90"
                    disabled={createBuyInMut.isPending}
                    onClick={async () => {
                      try {
                        await createBuyInMut.mutateAsync({
                          gameId,
                          body: { playerId: player.id },
                        });
                        toast.success(
                          `Rebuy registrado para ${player.name}`,
                        );
                      } catch {
                        toast.error("Falha ao registrar rebuy");
                      }
                    }}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary below table */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground md:gap-4 md:text-sm">
        <span>Buy-in: {formatCurrency(game.buyIn)}</span>
        <span>·</span>
        <span>{game.chipsPerPlayer} fichas/jogador</span>
        {game.finished && (
          <>
            <span>·</span>
            <span className="text-primary">Finalizada</span>
          </>
        )}
      </div>

      {game.finished && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setSettlementOpen(true)}
            className="gap-1.5 text-sm md:gap-2 md:text-base"
          >
            <Banknote className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Ver acertos
          </Button>
        </div>
      )}

      {!game.finished && (
        <div className="flex justify-center">
          <Button
            onClick={() => setFinalizeOpen(true)}
            className="gap-1.5 text-sm md:gap-2 md:text-base"
          >
            <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
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

      {game.finished && gameId && (
        <SettlementDialog
          open={settlementOpen}
          onOpenChange={setSettlementOpen}
          game={game}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir partida</AlertDialogTitle>
            <AlertDialogDescription>
              Esta partida deixa de contar para o histórico, ranking, resultados financeiros e saldos da
              carteira do grupo ({groupName}). O registro permanece apenas no banco de dados (exclusão
              lógica); não há restaurar pela interface no momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleDeleteGame();
              }}
              disabled={deleteGameMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGameMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
