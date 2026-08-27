import { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button, Input, Label } from "@poker-hub/design-system";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as R from "remeda";
import { useFinalizeGameMutation } from "@/models/games/hooks";
import { cn } from "@/lib/utils";

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

function parseChipValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sumCashOut(values: Record<string, unknown>): number {
  return R.sumBy(Object.values(values), parseChipValue);
}

function formatChipCount(value: number): string {
  return value.toLocaleString("pt-BR");
}

function chipBalanceMessage(
  enteredTotal: number,
  expectedTotal: number,
): { text: string; tone: "ok" | "error" } | null {
  const delta = enteredTotal - expectedTotal;
  if (delta === 0) {
    return { text: "Soma correta", tone: "ok" };
  }
  const amount = formatChipCount(Math.abs(delta));
  return delta < 0
    ? { text: `${amount} fichas faltando`, tone: "error" }
    : { text: `${amount} fichas a mais`, tone: "error" };
}

function makeFinalizeSchema(expectedTotal: number) {
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
    .superRefine((data, ctx) => {
      const enteredTotal = sumCashOut(data.cashOut);
      if (enteredTotal === expectedTotal) return;

      const balance = chipBalanceMessage(enteredTotal, expectedTotal);
      ctx.addIssue({
        code: "custom",
        message: balance?.text ?? "Soma incorreta de fichas",
        path: ["cashOut"],
      });
    });
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
        (record) => R.mapValues(record, (p) => p.cashOut ?? p.initialChips),
      ),
    [game.players],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FinalizeFormData>({
    defaultValues: { cashOut: defaultFinalChips },
    resolver: zodResolver(finalizeSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      reset({ cashOut: defaultFinalChips });
    }
  }, [open, defaultFinalChips, reset]);

  const cashOutValues = useWatch({ control, name: "cashOut" }) ?? {};
  const enteredTotal = useMemo(
    () =>
      R.sumBy(game.players, (player) =>
        parseChipValue(cashOutValues[player.id]),
      ),
    [cashOutValues, game.players],
  );
  const balance = chipBalanceMessage(enteredTotal, totalInitialChips);
  const canFinalize = balance?.tone === "ok";

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
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Finalizar partida</DialogTitle>
            <DialogDescription>
              Informe a quantidade de fichas de cada jogador ao final da
              partida. O total esperado é {formatChipCount(totalInitialChips)}{" "}
              fichas (inclui recompras).
            </DialogDescription>
          </DialogHeader>
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-center text-sm",
              balance?.tone === "ok"
                ? "border-success/40 bg-success/10"
                : "border-border bg-muted/40",
            )}
          >
            <p className="text-muted-foreground">
              Total informado:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatChipCount(enteredTotal)}
              </span>{" "}
              /{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatChipCount(totalInitialChips)}
              </span>{" "}
              fichas
            </p>
            {balance && (
              <p
                className={cn(
                  "mt-1 font-medium",
                  balance.tone === "ok" ? "text-success" : "text-destructive",
                )}
              >
                {balance.text}
              </p>
            )}
          </div>
          <div className="grid gap-4">
            {game.players.map((player) => (
              <div key={player.id} className="flex flex-col gap-2 items-start">
                <div className="flex items-center gap-4">
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
                {typeof errors.cashOut?.[player.id]?.message === "string" && (
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
            <Button
              type="submit"
              disabled={finalizeMut.isPending || !canFinalize}
            >
              {finalizeMut.isPending ? "Salvando…" : "Finalizar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
