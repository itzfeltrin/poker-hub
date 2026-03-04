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
  id: string;
  name: string;
  initialChips: number;
  cashOut: number | null;
};

type GameForFinalize = {
  id: string;
  buyIn: number;
  chipsPerPlayer: number;
  finished: boolean;
  players: GamePlayer[];
};

type FinalizeFormData = {
  cashOut: Record<string, number>;
};

function makeFinalizeSchema(initialChipsTotal: number) {
  return z
    .object({
      cashOut: z.record(
        z.string(),
        z.coerce
          .number()
          .or(z.nan().transform(() => 0))
          .pipe(z.number().min(0, "Deve ser ≥ 0")),
      ),
    })
    .refine(
      (data) =>
        Object.values(data.cashOut).reduce((a, b) => a + b, 0) ===
        initialChipsTotal,
      {
        message:
          "A soma das fichas finais deve ser igual à soma das fichas iniciais.",
        path: ["cashOut"],
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
    () => game.players.reduce((s, p) => s + p.initialChips, 0),
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
        (players) => R.indexBy(players, (p) => p.id),
        (record) =>
          R.mapValues(record, (p) => p.cashOut ?? p.initialChips),
      ),
    [game.players],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FinalizeFormData>({
    defaultValues: { cashOut: defaultFinalChips },
    resolver: zodResolver(finalizeSchema),
    mode: "onChange",
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await finalizeMut.mutateAsync({
        gameId,
        body: { cashOut: data.cashOut },
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
          {typeof errors.cashOut?.root?.message === "string" && (
            <p className="text-sm text-destructive text-center my-2">
              {errors.cashOut.root.message}
            </p>
          )}
          <div className="grid gap-4 py-4">
            {game.players.map((player) => (
              <div className="flex flex-col gap-2 items-start">
                <div key={player.id} className="flex items-center gap-4">
                  <PlayerAvatar name={player.name} size="sm" />
                  <Label
                    htmlFor={`chips-${player.id}`}
                    className="min-w-24 shrink-0"
                  >
                    {player.name}
                  </Label>
                  <Input
                    id={`chips-${player.id}`}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    className="bg-card"
                    {...register(`cashOut.${player.id}`, {
                      valueAsNumber: true,
                    })}
                  />
                  {/* Show the individual chip value error */}
                  <span className="text-muted-foreground text-sm shrink-0">
                    fichas
                  </span>
                </div>
                {typeof errors.cashOut?.[player.id]?.message ===
                  "string" && (
                  <p className="text-sm text-destructive">
                    {errors.cashOut[player.id]?.message}
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
