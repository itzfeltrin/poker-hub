import { useState } from "react";
import { usePoker, GamePlayer } from "@/context/PokerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export default function NewGamePage() {
  const { players, addGame } = usePoker();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<
    Record<string, { buyIn: string; cashOut: string }>
  >({});

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = { buyIn: "", cashOut: "" };
      }
      return copy;
    });
  };

  const updateField = (id: string, field: "buyIn" | "cashOut", value: string) => {
    setSelectedPlayers((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSubmit = () => {
    const entries = Object.entries(selectedPlayers);
    if (entries.length < 2) {
      toast.error("Select at least 2 players");
      return;
    }
    if (!location.trim()) {
      toast.error("Add a location");
      return;
    }

    const gamePlayers: GamePlayer[] = entries.map(([playerId, data]) => ({
      playerId,
      buyIn: Number(data.buyIn) || 0,
      cashOut: Number(data.cashOut) || 0,
    }));

    addGame({ date, location: location.trim(), players: gamePlayers });
    toast.success("Game logged!");
    navigate("/history");
  };

  return (
    <div className="space-y-8 max-w-2xl pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log a Game</h1>
        <p className="text-muted-foreground mt-1">Record the results of your session.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-card" />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input placeholder="e.g. Alex's Place" value={location} onChange={(e) => setLocation(e.target.value)} className="bg-card" />
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Players & Results</Label>
        <div className="space-y-3">
          {players.map((player) => {
            const selected = !!selectedPlayers[player.id];
            return (
              <div
                key={player.id}
                className={`rounded-xl border p-4 transition-all ${
                  selected ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => togglePlayer(player.id)}
                  />
                  <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                  <span className="font-medium flex-1">{player.name}</span>
                </div>
                {selected && (
                  <div className="mt-3 grid grid-cols-2 gap-3 pl-10">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Buy-in ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={selectedPlayers[player.id].buyIn}
                        onChange={(e) => updateField(player.id, "buyIn", e.target.value)}
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cash-out ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={selectedPlayers[player.id].cashOut}
                        onChange={(e) => updateField(player.id, "cashOut", e.target.value)}
                        className="bg-card"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Button onClick={handleSubmit} className="w-full sm:w-auto" size="lg">
        Save Game
      </Button>
    </div>
  );
}
