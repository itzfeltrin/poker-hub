import { useState } from "react";
import { usePoker } from "@/context/PokerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPnl } from "@/lib/utils";

export default function PlayersPage() {
  const {
    players,
    addPlayer,
    removePlayer,
    getPlayerPnL,
    getPlayerGamesCount,
  } = usePoker();
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (newName.trim()) {
      addPlayer(newName.trim());
      setNewName("");
    }
  };

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jogadores</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie sua turma de poker.
        </p>
      </div>

      <div className="flex gap-3 max-w-md">
        <Input
          placeholder="Nome do jogador..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="bg-card"
        />
        <Button onClick={handleAdd} disabled={!newName.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {players.map((player) => {
            const pnl = getPlayerPnL(player.id);
            const gamesCount = getPlayerGamesCount(player.id);
            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-xl border border-border bg-card p-5 card-hover flex items-center gap-4"
              >
                <PlayerAvatar name={player.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-lg truncate">
                    {player.name}
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span>{gamesCount} partidas</span>
                    <span
                      className={
                        pnl >= 0
                          ? "text-success font-medium"
                          : "text-loss font-medium"
                      }
                    >
                      {formatPnl(pnl)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-loss shrink-0"
                  onClick={() => removePlayer(player.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
