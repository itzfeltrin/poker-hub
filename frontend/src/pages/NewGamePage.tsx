import { usePlayersQuery, useCreateGameMutation } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  date: z.coerce.date({
    errorMap: (_issue, _ctx) => {
      return { message: "Data inválida" };
    },
  }),
  location: z.string(),
  buyIn: z.number().min(0, "Entrada é obrigatória"),
  chipsPerPlayer: z.number().min(1, "Número de fichas é obrigatório"),
  players: z.record(
    z.string(),
    z.object({
      buyIn: z.number().min(0, "Entrada é obrigatória"),
    }),
  ),
});

type FormData = z.infer<typeof formSchema>;

const defaultValues: FormData = {
  date: new Date(),
  location: "",
  buyIn: 0,
  chipsPerPlayer: 0,
  players: {},
};

export default function NewGamePage() {
  // --- API hooks ---
  const { data: players = [] } = usePlayersQuery();
  const createGameMut = useCreateGameMutation();

  // --- Routing ---
  const navigate = useNavigate();

  // --- Form ---
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues,
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const formBuyIn = watch("buyIn");
  const formPlayers = watch("players") ?? {};

  const togglePlayer = (id: string) => {
    const current = watch("players") ?? {};
    if (current[id]) {
      const { [id]: _, ...rest } = current;
      setValue("players", rest);
    } else {
      setValue("players", {
        ...current,
        [id]: { buyIn: formBuyIn },
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    const players = Object.entries(data.players).map(
      ([playerId, playerData]) => ({
        playerId,
        buyIn: playerData.buyIn,
      }),
    );

    try {
      await createGameMut.mutateAsync({
        buyIn: data.buyIn,
        chipsPerPlayer: data.chipsPerPlayer,
        playerIds: players.map((p) => p.playerId),
        location: data.location,
        date: data.date,
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
            {...register("date", { valueAsDate: true })}
            type="date"
            className="bg-card"
            tabIndex={1}
            aria-invalid={!!errors.date}
          />
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Local</Label>
          <Input
            {...register("location")}
            placeholder="ex.: Casa do Caio"
            className="bg-card"
            tabIndex={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Entrada (R$)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            placeholder="0,00"
            {...register("buyIn", { valueAsNumber: true })}
            className="bg-card"
            tabIndex={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Número de fichas</Label>
          <Input
            type="number"
            inputMode="numeric"
            step={50}
            min={1}
            placeholder="Ex: 1000"
            {...register("chipsPerPlayer", { valueAsNumber: true })}
            className="bg-card"
            tabIndex={4}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Jogadores</Label>
        <div className="space-y-3">
          {players.map((player) => {
            const selected = !!formPlayers[player.id];
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
                    tabIndex={5}
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
                        {...register(`players.${player.id}.buyIn`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleSubmit(onSubmit)}
        className="w-full sm:w-auto"
        size="lg"
      >
        Salvar partida
      </Button>
    </div>
  );
}
