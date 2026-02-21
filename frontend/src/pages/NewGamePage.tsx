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
  const [buyIn, setBuyIn] = useState("");
  const [chipsPerPlayer, setChipsPerPlayer] = useState("");
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

  const updateField = (
    id: string,
    field: "buyIn" | "cashOut",
    value: string,
  ) => {
    setSelectedPlayers((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    const entries = Object.entries(selectedPlayers);
    if (entries.length < 2) {
      toast.error("Selecione pelo menos 2 jogadores");
      return;
    }

    const gamePlayers: GamePlayer[] = entries.map(([playerId, data]) => ({
      playerId,
      buyIn: Number(data.buyIn) || 0,
      cashOut: Number(data.cashOut) || 0,
    }));

    const buyInNum = buyIn.trim() ? Number(buyIn.replace(",", ".")) : undefined;
    const chipsNum = chipsPerPlayer.trim()
      ? Math.max(1, Math.floor(Number(chipsPerPlayer)))
      : undefined;

    try {
      await addGame({
        date,
        location: location.trim(),
        players: gamePlayers,
        ...(buyInNum != null && !Number.isNaN(buyInNum) && { buyIn: buyInNum }),
        ...(chipsNum != null && !Number.isNaN(chipsNum) && {
          chipsPerPlayer: chipsNum,
        }),
      });
      toast.success("Partida registrada!");
      navigate({ to: "/history" });
    } catch {
      toast.error("Falha ao salvar partida");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registrar partida</h1>
        <p className="text-muted-foreground mt-1">
          Registre o resultado da sua sessão.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Data</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-card"
          />
        </div>
        <div className="space-y-2">
          <Label>Local</Label>
          <Input
            placeholder="ex.: Casa do Caio"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-card"
          />
        </div>
        <div className="space-y-2">
          <Label>Entrada (R$)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step={0.01}
            min={0}
            placeholder="0,00"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            className="bg-card"
          />
        </div>
        <div className="space-y-2">
          <Label>Número de fichas</Label>
          <Input
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            placeholder="Ex: 1000"
            value={chipsPerPlayer}
            onChange={(e) => setChipsPerPlayer(e.target.value)}
            className="bg-card"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Jogadores</Label>
        <div className="space-y-3">
          {players.map((player) => {
            const selected = !!selectedPlayers[player.id];
            return (
              <div
                key={player.id}
                className={`rounded-xl border p-4 transition-all ${
                  selected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => togglePlayer(player.id)}
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
                        value={selectedPlayers[player.id].buyIn}
                        onChange={(e) =>
                          updateField(player.id, "buyIn", e.target.value)
                        }
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Saída ($)
                      </Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={selectedPlayers[player.id].cashOut}
                        onChange={(e) =>
                          updateField(player.id, "cashOut", e.target.value)
                        }
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
        Salvar partida
      </Button>
    </div>
  );
}
