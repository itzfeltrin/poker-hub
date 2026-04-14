import { Link, useParams } from "@tanstack/react-router";
import {
  useGroupLedgerQuery,
  useCreateLedgerEntryMutation,
  useGroupMembersQuery,
  useGroupQuery,
} from "@/api/hooks";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Wallet } from "lucide-react";
import { formatPnl } from "@/lib/utils";
import {
  Container,
  Lockup,
  FormControl,
  Button,
  Input,
} from "@poker-hub/design-system";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as R from "remeda";

function centsToBrl(cents: number): number {
  return cents / 100;
}

const paymentFormSchema = z.object({
  groupMemberId: z
    .string()
    .min(1, "Selecione um jogador")
    .uuid("Selecione um jogador"),
  amountBrl: z
    .string()
    .min(1, "Informe o valor")
    .transform((s) => Number(String(s).replace(",", ".")))
    .refine((n) => Number.isFinite(n) && n > 0, "Valor inválido"),
  direction: z.enum(["pay", "receive"]),
  note: z.string().optional(),
});

type PaymentFormInput = z.input<typeof paymentFormSchema>;

function transactionLabel(
  t: "game" | "payment" | "manual",
): { label: string; className: string } {
  switch (t) {
    case "game":
      return { label: "Partida", className: "text-primary" };
    case "payment":
      return { label: "Pagamento", className: "text-muted-foreground" };
    case "manual":
      return { label: "Ajuste", className: "text-muted-foreground" };
    default:
      return { label: t, className: "" };
  }
}

export default function GroupLedgerPage() {
  const { groupId } = useParams({ from: "/groups/$groupId/ledger" });
  const { data: group, isLoading: groupLoading } = useGroupQuery(groupId);
  const { data: snapshot, isLoading: ledgerLoading } =
    useGroupLedgerQuery(groupId);
  const { data: members = [] } = useGroupMembersQuery(groupId);
  const createMut = useCreateLedgerEntryMutation(groupId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput>({
    defaultValues: {
      groupMemberId: "",
      amountBrl: "",
      direction: "pay",
      note: "",
    },
    resolver: zodResolver(paymentFormSchema),
  });

  const direction = watch("direction");

  const onSubmitPayment = async (data: z.output<typeof paymentFormSchema>) => {
    const cents = Math.round(data.amountBrl * 100);
    const signed =
      data.direction === "pay" ? cents : -cents;
    try {
      await createMut.mutateAsync({
        groupMemberId: data.groupMemberId,
        amountCents: signed,
        transactionType: "payment",
        note: data.note?.trim() || null,
      });
      toast.success("Lançamento registrado");
      reset({
        groupMemberId: "",
        amountBrl: "",
        direction: data.direction,
        note: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    }
  };

  const onSubmitManual = handleSubmit(onSubmitPayment);

  if (groupLoading || !group) {
    return (
      <Container size="md">
        <p className="text-muted-foreground">Carregando…</p>
      </Container>
    );
  }

  return (
    <Container size="md">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/groups/$groupId" params={{ groupId }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao grupo
          </Link>
        </Button>
        <Lockup>
          <div className="flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            <Lockup.Title>Bolão</Lockup.Title>
          </div>
          <Lockup.Subtitle>
            Saldos e lançamentos do grupo «{group.name}». Pagamentos são só
            registro — o dinheiro é combinado fora do app.
          </Lockup.Subtitle>
        </Lockup>
      </div>

      <section className="space-y-3 mb-10">
        <h2 className="text-lg font-display font-semibold">Saldos</h2>
        {ledgerLoading && (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}
        {!ledgerLoading && snapshot && snapshot.balances.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum membro no grupo.
          </p>
        )}
        <ul className="space-y-2">
          {snapshot?.balances.map((b) => (
            <li
              key={b.groupMemberId}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <PlayerAvatar name={b.playerName} size="sm" />
                <span className="font-medium truncate">{b.playerName}</span>
              </div>
              <span
                className={`font-display font-semibold tabular-nums shrink-0 ${
                  b.balanceCents > 0
                    ? "text-success"
                    : b.balanceCents < 0
                      ? "text-loss"
                      : "text-muted-foreground"
                }`}
              >
                {formatPnl(centsToBrl(b.balanceCents))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4 mb-10">
        <h2 className="text-lg font-display font-semibold">
          Registrar pagamento
        </h2>
        <p className="text-sm text-muted-foreground">
          <strong>Pagou à mesa</strong>: valor positivo reduz dívida (saldo
          negativo). <strong>Recebeu</strong>: valor positivo registra que
          retirou o que tinha a receber (saldo positivo).
        </p>
        <form onSubmit={onSubmitManual} className="space-y-4 max-w-md">
          <FormControl label="Jogador">
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              {...register("groupMemberId")}
              aria-invalid={!!errors.groupMemberId}
            >
              <option value="">Selecione…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {errors.groupMemberId && (
              <p className="text-sm text-destructive mt-1">
                {errors.groupMemberId.message}
              </p>
            )}
          </FormControl>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="pay"
                {...register("direction")}
                className="accent-primary"
              />
              Pagou à mesa
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="receive"
                {...register("direction")}
                className="accent-primary"
              />
              Recebeu (sacou)
            </label>
          </div>
          <FormControl
            label={direction === "pay" ? "Valor pago (R$)" : "Valor recebido (R$)"}
          >
            <Input
              inputMode="decimal"
              placeholder="0,00"
              className="bg-background"
              {...register("amountBrl")}
              aria-invalid={!!errors.amountBrl}
            />
            {errors.amountBrl && (
              <p className="text-sm text-destructive mt-1">
                {String(errors.amountBrl.message)}
              </p>
            )}
          </FormControl>
          <FormControl label="Nota (opcional)">
            <Input
              placeholder="ex.: PIX para Fulano"
              className="bg-background"
              {...register("note")}
            />
          </FormControl>
          <Button type="submit" disabled={isSubmitting || createMut.isPending}>
            {createMut.isPending ? "Salvando…" : "Registrar pagamento"}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-display font-semibold">Extrato</h2>
        {!ledgerLoading &&
          snapshot &&
          R.isEmpty(snapshot.entries) && (
            <p className="text-sm text-muted-foreground">
              Nenhum lançamento ainda. Finalize partidas ou registre pagamentos
              acima.
            </p>
          )}
        <ul className="space-y-2">
          {snapshot?.entries.map((e) => {
            const meta = transactionLabel(e.transactionType);
            return (
              <li
                key={e.id}
                className="rounded-lg border border-border/80 bg-card/50 px-4 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PlayerAvatar name={e.playerName} size="sm" />
                      <span className="font-medium">{e.playerName}</span>
                      <span className={`text-xs ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(e.createdAt), "PPp", { locale: ptBR })}
                    </p>
                    {e.note && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {e.note}
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-display font-semibold tabular-nums shrink-0 ${
                      e.amountCents > 0
                        ? "text-success"
                        : e.amountCents < 0
                          ? "text-loss"
                          : "text-muted-foreground"
                    }`}
                  >
                    {formatPnl(centsToBrl(e.amountCents))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </Container>
  );
}
