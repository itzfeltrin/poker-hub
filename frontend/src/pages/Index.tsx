import { usePoker } from "@/context/PokerContext";
import { StatCard } from "@/components/StatCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Link } from "@tanstack/react-router";
import { Users, Gamepad2, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const Index = () => {
  const { players, games, getPlayerPnL, getPlayerById } = usePoker();

  const totalPot = games.reduce(
    (sum, g) => sum + g.players.reduce((s, p) => s + p.buyIn, 0),
    0
  );

  const topPlayer = players.reduce(
    (best, p) => {
      const pnl = getPlayerPnL(p.id);
      return pnl > best.pnl ? { player: p, pnl } : best;
    },
    { player: players[0], pnl: -Infinity }
  );

  const recentGames = [...games].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient-gold">Poker Hub</span>
          </h1>
          <p className="text-muted-foreground mt-1">Track your games, settle the scores.</p>
        </div>
        <Button asChild className="hidden md:flex">
          <Link to="/new-game">
            <Plus className="h-4 w-4 mr-2" />
            New Game
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Players"
          value={players.length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Games Played"
          value={games.length}
          icon={<Gamepad2 className="h-4 w-4" />}
        />
        <StatCard
          label="Total Pot"
          value={`$${totalPot}`}
          icon={<span className="text-sm">💰</span>}
        />
        <StatCard
          label="Top Player"
          value={topPlayer.player?.name ?? "—"}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold">Recent Games</h2>
          <Link to="/history" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="space-y-3">
          {recentGames.map((game) => (
            <div
              key={game.id}
              className="rounded-xl border border-border bg-card p-4 card-hover"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-display font-semibold">{game.location}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(game.date), "MMM d, yyyy")}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {game.players.length} players
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {game.players.map((gp) => {
                  const player = getPlayerById(gp.playerId);
                  if (!player) return null;
                  const pnl = gp.cashOut - gp.buyIn;
                  return (
                    <div key={gp.playerId} className="flex items-center gap-2">
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                      <div className="text-sm">
                        <span className="text-foreground">{player.name}</span>{" "}
                        <span
                          className={
                            pnl >= 0 ? "text-success font-medium" : "text-loss font-medium"
                          }
                        >
                          {pnl >= 0 ? "+" : ""}${pnl}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
