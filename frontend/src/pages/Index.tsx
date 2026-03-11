import {
  usePlayersQuery,
  useHistoryQuery,
  useProfitLossQuery,
} from "@/api/hooks";
import { getPlayerPnL, getPlayerById } from "@/utils/player";
import { StatCard } from "@/components/StatCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Link } from "@tanstack/react-router";
import { Users, Gamepad2, TrendingUp, Plus, DollarSign } from "lucide-react";
import { formatPnl, formatCurrency, formatDate } from "@/lib/utils";
import {
  Container,
  Lockup,
  Heading,
  Button,
  Grid,
} from "@poker-hub/design-system";

const Index = () => {
  const { data: players = [] } = usePlayersQuery();
  const { data: games = [] } = useHistoryQuery();
  const { data: profitLoss } = useProfitLossQuery({ period: "all_time" });

  const totalPot = games.reduce((sum, g) => {
    const totalInitialChips = g.players.reduce(
      (acc, p) => acc + p.initialChips,
      0,
    );
    const pot =
      g.chipsPerPlayer > 0
        ? (totalInitialChips / g.chipsPerPlayer) * g.buyIn
        : g.buyIn * g.players.length;
    return sum + pot;
  }, 0);

  const topPlayer = players.reduce(
    (best, p) => {
      const pnl = getPlayerPnL(profitLoss, p.id);
      return pnl > best.pnl ? { player: p, pnl } : best;
    },
    { player: players[0], pnl: -Infinity },
  );

  const recentGames = [...games]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <Container size="full">
      <div className="flex items-end justify-between">
        <Lockup>
          <Lockup.Title className="text-gradient-gold">Poker Hub</Lockup.Title>
          <Lockup.Subtitle>
            Acompanhe suas partidas e acerte as contas.
          </Lockup.Subtitle>
        </Lockup>
        <Button asChild className="hidden md:flex">
          <Link to="/new-game">
            <Plus className="h-4 w-4 mr-2" />
            Nova partida
          </Link>
        </Button>
      </div>

      <Grid cols={4}>
        <StatCard
          label="Jogadores"
          value={players.length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Partidas"
          value={games.length}
          icon={<Gamepad2 className="h-4 w-4" />}
        />
        <StatCard
          label="Pote total"
          value={formatCurrency(totalPot)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Melhor jogador"
          value={topPlayer.player?.name ?? "—"}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
      </Grid>

      <section>
        <div className="flex items-center justify-between mb-4">
          <Heading>Partidas recentes</Heading>
          <Link to="/history" className="text-sm text-primary hover:underline">
            Ver todas →
          </Link>
        </div>
        <div className="space-y-3">
          {recentGames.map((game) => (
            <Link
              key={game.id}
              to="/games/$gameId"
              params={{ gameId: game.id }}
              className="block rounded-xl border border-border bg-card p-4 card-hover transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-display font-semibold">{game.location}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(game.date)}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {game.players.length} jogadores
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {game.players.map((gp) => {
                  const player = getPlayerById(players, gp.id);
                  if (!player) return null;
                  const chipProfit = (gp.cashOut ?? 0) - gp.initialChips;
                  const pnl = chipProfit * (game.buyIn / game.chipsPerPlayer);
                  return (
                    <div key={gp.id} className="flex items-center gap-2">
                      <PlayerAvatar name={player.name} size="sm" />
                      <div className="text-sm">
                        <span className="text-foreground">{player.name}</span>{" "}
                        <span
                          className={
                            gp.cashOut === null
                              ? "text-muted-foreground"
                              : pnl >= 0
                                ? "text-success font-medium"
                                : "text-loss font-medium"
                          }
                        >
                          {formatPnl(pnl)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Container>
  );
};

export default Index;
