import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getSettlementTransactions, formatCurrency } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type GamePlayer = {
  id: string;
  name: string;
  initialChips: number;
  cashOut: number | null;
};

type GameForSettlement = {
  buyIn: number;
  chipsPerPlayer: number;
  players: GamePlayer[];
};

interface SettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: GameForSettlement;
}

export function SettlementDialog({
  open,
  onOpenChange,
  game,
}: SettlementDialogProps) {
  const transactions = getSettlementTransactions(
    game.players,
    game.buyIn,
    game.chipsPerPlayer,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acertos da partida</DialogTitle>
          <DialogDescription>
            Menor número de pagamentos para acertar as contas.
          </DialogDescription>
        </DialogHeader>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Ninguém precisa pagar ninguém.
          </p>
        ) : (
          <ul className="space-y-3 py-2">
            {transactions.map((tx, i) => (
              <li
                key={`${tx.fromId}-${tx.toId}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5 text-sm"
              >
                <span className="font-medium truncate flex-1 min-w-0">
                  {tx.fromName}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="font-medium truncate flex-1 min-w-0 text-right">
                  {tx.toName}
                </span>
                <span className="shrink-0 font-semibold text-primary tabular-nums">
                  {formatCurrency(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
