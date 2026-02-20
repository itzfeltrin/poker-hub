import { usePoker } from "@/context/PokerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { motion } from "framer-motion";

export default function StandingsPage() {
  const { players, getPlayerPnL, getPlayerGamesCount } = usePoker();

  const standings = players
    .map((p) => ({
      ...p,
      pnl: getPlayerPnL(p.id),
      games: getPlayerGamesCount(p.id),
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const maxAbsPnl = Math.max(...standings.map((s) => Math.abs(s.pnl)), 1);

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Standings</h1>
        <p className="text-muted-foreground mt-1">All-time profit & loss leaderboard.</p>
      </div>

      <div className="space-y-3">
        {standings.map((player, i) => {
          const barWidth = (Math.abs(player.pnl) / maxAbsPnl) * 100;
          const isPositive = player.pnl >= 0;
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card p-5 card-hover"
            >
              <div className="flex items-center gap-4">
                <span className="font-display font-bold text-lg text-muted-foreground w-8 text-center">
                  {i === 0 ? "👑" : `#${i + 1}`}
                </span>
                <PlayerAvatar avatar={player.avatar} name={player.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-display font-semibold">{player.name}</p>
                    <p
                      className={`font-display font-bold text-lg ${
                        isPositive ? "text-success" : "text-loss"
                      }`}
                    >
                      {isPositive ? "+" : ""}${player.pnl}
                    </p>
                  </div>
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className={`absolute inset-y-0 left-0 rounded-full ${
                        isPositive ? "bg-success" : "bg-loss"
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{player.games} games played</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
