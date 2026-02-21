import { usePoker } from "@/context/PokerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { format } from "date-fns";
import { formatCurrency, formatPnl } from "@/lib/utils";

export default function HistoryPage() {
  const { games, getPlayerById } = usePoker();
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Histórico de partidas
        </h1>
        <p className="text-muted-foreground mt-1">
          {games.length} partidas registradas.
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">
          Nenhuma partida ainda. Registre uma!
        </p>
      ) : (
        <div className="space-y-4">
          {sorted.map((game) => {
            const totalPot = game.players.reduce((s, p) => s + p.buyIn, 0);
            return (
              <div
                key={game.id}
                className="rounded-xl border border-border bg-card p-5 card-hover"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-display font-semibold text-lg">
                      {game.location}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(game.date), "EEEE, MMM d, yyyy")}
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
                        const player = getPlayerById(gp.playerId);
                        if (!player) return null;
                        const pnl = gp.cashOut - gp.buyIn;
                        return (
                          <tr
                            key={gp.playerId}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <PlayerAvatar name={player.name} size="sm" />
                                {player.name}
                              </div>
                            </td>
                            <td className="text-right py-2.5">
                              {formatCurrency(gp.buyIn)}
                            </td>
                            <td className="text-right py-2.5">
                              {formatCurrency(gp.cashOut)}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
