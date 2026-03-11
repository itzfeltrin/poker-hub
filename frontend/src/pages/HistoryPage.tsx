import { Link } from "@tanstack/react-router";
import { useHistoryQuery, usePlayersQuery } from "@/api/hooks";
import { getPlayerById } from "@/utils/player";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { formatCurrency, formatPnl, formatDate } from "@/lib/utils";
import { Container, Lockup } from "@poker-hub/design-system";

export default function HistoryPage() {
  const { data: games = [] } = useHistoryQuery();
  const { data: players } = usePlayersQuery();

  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Container size="full">
      <Lockup>
        <Lockup.Title>Histórico de partidas</Lockup.Title>
        <Lockup.Subtitle>{games.length} partidas registradas.</Lockup.Subtitle>
      </Lockup>

      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">
          Nenhuma partida ainda. Registre uma!
        </p>
      ) : (
        <div className="space-y-4">
          {sorted.map((game) => {
            const totalInitialChips = game.players.reduce(
              (sum, p) => sum + p.initialChips,
              0,
            );
            const totalPot =
              game.chipsPerPlayer > 0
                ? (totalInitialChips / game.chipsPerPlayer) * game.buyIn
                : game.buyIn * game.players.length;
            return (
              <Link
                key={game.id}
                to="/games/$gameId"
                params={{ gameId: game.id }}
                className="block rounded-xl border border-border bg-card p-5 card-hover transition-colors hover:border-primary/30"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-display font-semibold text-lg">
                      {game.location}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(game.date)}
                    </p>
                  </div>
                  <span className="text-sm font-display font-semibold text-accent">
                    Pote: {formatCurrency(totalPot)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">Jogador</th>
                        <th className="text-right py-2 font-medium">Entrada</th>
                        <th className="text-right py-2 font-medium">Saída</th>
                        <th className="text-right py-2 font-medium">
                          Resultado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.players.map((gp) => {
                        const player = getPlayerById(players, gp.id);
                        if (!player) return null;
                        const pricePerChip = game.buyIn / game.chipsPerPlayer;
                        const initialPrice = gp.initialChips * pricePerChip;
                        const cashOutChips = gp.cashOut ?? 0;
                        const finalPrice = cashOutChips * pricePerChip;
                        const pnl = finalPrice - initialPrice;
                        return (
                          <tr
                            key={gp.id}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <PlayerAvatar name={player.name} size="sm" />
                                {player.name}
                              </div>
                            </td>
                            <td className="text-right py-2.5">
                              {formatCurrency(initialPrice)}
                            </td>
                            <td className="text-right py-2.5">
                              {formatCurrency(finalPrice)}
                            </td>
                            <td
                              className={`text-right py-2.5 font-semibold ${
                                pnl >= 0 ? "text-success" : "text-loss"
                              }`}
                            >
                              {formatPnl(pnl)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
