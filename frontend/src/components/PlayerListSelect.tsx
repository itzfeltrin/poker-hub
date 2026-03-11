import type { PlayerRow } from "@poker-hub/db/schema";
import { Checkbox, Input, Label } from "@poker-hub/design-system";
import { PlayerAvatar } from "./PlayerAvatar";
import { cn } from "@/lib/utils";

interface PlayerSelection {
  buyIn: number;
}

interface PlayerListSelectProps {
  players: PlayerRow[];
  selectedPlayers: Record<string, PlayerSelection>;
  onTogglePlayer: (playerId: string) => void;
  onUpdatePlayerBuyIn: (playerId: string, buyIn: number) => void;
  className?: string;
}

export function PlayerListSelect({
  players,
  selectedPlayers,
  onTogglePlayer,
  onUpdatePlayerBuyIn,
  className,
}: PlayerListSelectProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-base">Jogadores</Label>
      <div className="space-y-3">
        {players.map((player) => {
          const selected = !!selectedPlayers[player.id];
          return (
            <div
              key={player.id}
              className={cn(
                "rounded-xl border p-4 transition-all",
                selected
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onTogglePlayer(player.id)}
                />
                <PlayerAvatar name={player.name} size="sm" />
                <span className="font-medium flex-1">{player.name}</span>
              </div>
              {selected && (
                <div className="mt-3 grid grid-cols-2 gap-3 pl-10">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Entrada ($)
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="bg-card"
                      value={selectedPlayers[player.id]?.buyIn ?? 0}
                      onChange={(e) =>
                        onUpdatePlayerBuyIn(player.id, Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
