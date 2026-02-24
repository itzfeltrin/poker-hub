import { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as R from "remeda";
import { useFinalizeGameMutation } from "@/models/games/hooks";

type GamePlayer = {
  player_id: string;
  name: string;
  initial_chips: number;
  final_chips: number | null;
};

type GameForFinalize = {
  id: string;
  buy_in: number;
  chips_per_player: number;
  finished: boolean;
  players: GamePlayer[];
};

type FinalizeFormData = {
  final_chips: Record<string, number>;
};

function makeFinalizeSchema(initialChipsTotal: number) {
  return z
    .object({
      final_chips: z.record(
        z.string(),
        z.coerce
          .number()
          .or(z.nan().transform(() => 0))
          .pipe(z.number().min(1, "Deve ser ≥ 0")),
      ),
    })
    .refine(
      (data) =>
        Object.values(data.final_chips).reduce((a, b) => a + b, 0) ===
        initialChipsTotal,
      {
        message:
          "A soma das fichas finais deve ser igual à soma das fichas iniciais.",
        path: ["final_chips"],
      },
    );
}

interface FinalizeGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  game: GameForFinalize;
}

export function FinalizeGameDialog({
  open,
  onOpenChange,
  gameId,
  game,
}: FinalizeGameDialogProps) {
  const finalizeMut = useFinalizeGameMutation();

  const totalInitialChips = useMemo(
    () => game.players.reduce((s, p) => s + p.initial_chips, 0),
    [game.players],
  );

  const finalizeSchema = useMemo(
    () => makeFinalizeSchema(totalInitialChips),
    [totalInitialChips],
  );

  const defaultFinalChips = useMemo(
    () =>
      R.pipe(
        game.players,
        (players) => R.indexBy(players, (p) => p.player_id),
        (record) =>
          R.mapValues(record, (p) => p.final_chips ?? p.initial_chips),
      ),
    [game.players],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FinalizeFormData>({
    defaultValues: { final_chips: defaultFinalChips },
    resolver: zodResolver(finalizeSchema),
    mode: "onChange",
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await finalizeMut.mutateAsync({
        gameId,
        body: { final_chips: data.final_chips },
      });
      toast.success("Partida finalizada!");
      onOpenChange(false);
    } catch {
      toast.error("Falha ao finalizar partida");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Finalizar partida</DialogTitle>
            <DialogDescription>
              Informe a quantidade de fichas de cada jogador ao final da
              partida. A soma deve ser {totalInitialChips} fichas.
            </DialogDescription>
          </DialogHeader>
          {typeof errors.final_chips?.root?.message === "string" && (
            <p className="text-sm text-destructive text-center my-2">
              {errors.final_chips.root.message}
            </p>
          )}
          <div className="grid gap-4 py-4">
            {game.players.map((player) => (
              <div className="flex flex-col gap-2 items-start">
                <div key={player.player_id} className="flex items-center gap-4">
                  <PlayerAvatar name={player.name} size="sm" />
                  <Label
                    htmlFor={`chips-${player.player_id}`}
                    className="min-w-24 shrink-0"
                  >
                    {player.name}
                  </Label>
                  <Input
                    id={`chips-${player.player_id}`}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    className="bg-card"
                    {...register(`final_chips.${player.player_id}`, {
                      valueAsNumber: true,
                    })}
                  />
                  {/* Show the individual chip value error */}
                  <span className="text-muted-foreground text-sm shrink-0">
                    fichas
                  </span>
                </div>
                {typeof errors.final_chips?.[player.player_id]?.message ===
                  "string" && (
                  <p className="text-sm text-destructive">
                    {errors.final_chips[player.player_id]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={finalizeMut.isPending}>
              {finalizeMut.isPending ? "Salvando…" : "Finalizar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
