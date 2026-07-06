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
import { maxPeerPaymentCents } from "@poker-hub/db/peer-payment";
import { useMemo } from "react";

function centsToBrl(cents: number): number {
  return cents / 100;
}

const paymentFormSchema = z
  .object({
    payerGroupMemberId: z
      .string()
      .min(1, "Selecione quem pagou")
      .uuid("Selecione quem pagou"),
    recipientGroupMemberId: z
      .string()
      .min(1, "Selecione quem recebeu")
      .uuid("Selecione quem recebeu"),
    amountBrl: z.coerce
      .string()
      .transform((s) => Number(String(s).replace(",", ".")))
      .pipe(z.number().min(1, "Informe o valor")),
    note: z.string().optional(),
  })
  .refine((data) => data.payerGroupMemberId !== data.recipientGroupMemberId, {
    message: "Quem paga e quem recebe devem ser diferentes",
    path: ["recipientGroupMemberId"],
  });

type PaymentFormInput = z.input<typeof paymentFormSchema>;

function transactionLabel(t: "game" | "payment" | "manual"): {
  label: string;
  className: string;
} {
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

function balanceLabel(balanceCents: number): string {
  if (balanceCents < 0) return `deve ${formatPnl(centsToBrl(-balanceCents))}`;
  if (balanceCents > 0)
    return `a receber ${formatPnl(centsToBrl(balanceCents))}`;
  return "zerado";
}

export default function GroupLedgerPage() {
  const { groupId } = useParams({ from: "/groups/$groupId/ledger" });
  const { data: group, isLoading: groupLoading } = useGroupQuery(groupId);
  const { data: snapshot, isLoading: ledgerLoading } =
    useGroupLedgerQuery(groupId);
  const { data: members = [] } = useGroupMembersQuery(groupId);
  const createMut = useCreateLedgerEntryMutation(groupId);

  const balanceByMemberId = useMemo(
    () => R.indexBy(snapshot?.balances ?? [], (b) => b.groupMemberId),
    [snapshot?.balances],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput>({
    defaultValues: {
      payerGroupMemberId: "",
      recipientGroupMemberId: "",
      amountBrl: "",
      note: "",
    },
    resolver: zodResolver(paymentFormSchema),
  });

  const payerGroupMemberId = watch("payerGroupMemberId");
  const recipientGroupMemberId = watch("recipientGroupMemberId");

  const maxPaymentCents = useMemo(() => {
    const payer = balanceByMemberId[payerGroupMemberId];
    const recipient = balanceByMemberId[recipientGroupMemberId];
    if (!payer || !recipient) return 0;
    return maxPeerPaymentCents(payer.balanceCents, recipient.balanceCents);
  }, [balanceByMemberId, payerGroupMemberId, recipientGroupMemberId]);

  const onSubmitPayment = handleSubmit(async (raw) => {
    const data = paymentFormSchema.parse(raw);
    const payer = balanceByMemberId[data.payerGroupMemberId];
    const recipient = balanceByMemberId[data.recipientGroupMemberId];
    if (!payer || !recipient) {
      toast.error("Selecione jogadores válidos");
      return;
    }

    const cents = Math.round(data.amountBrl * 100);
    const maxCents = maxPeerPaymentCents(
      payer.balanceCents,
      recipient.balanceCents,
    );

    if (maxCents === 0) {
      setError("amountBrl", {
        message: "Quem paga precisa estar no vermelho e quem recebe no verde",
      });
      return;
    }

    if (cents > maxCents) {
      setError("amountBrl", {
        message: `Máximo permitido: ${formatPnl(centsToBrl(maxCents))}`,
      });
      return;
    }

    try {
      await createMut.mutateAsync({
        groupMemberId: data.payerGroupMemberId,
        counterpartyGroupMemberId: data.recipientGroupMemberId,
        amountCents: cents,
        transactionType: "payment",
        note: data.note?.trim() || null,
      });
      toast.success("Pagamento registrado");
      reset({
        payerGroupMemberId: "",
        recipientGroupMemberId: "",
        amountBrl: "",
        note: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    }
  });

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
          Registre um pagamento entre dois jogadores. O valor reduz a dívida de
          quem pagou e o crédito de quem recebeu. O máximo é o menor entre o que
          quem paga deve e o que quem recebe tem a receber.
        </p>
        <form onSubmit={onSubmitPayment} className="space-y-4 max-w-md">
          <FormControl label="Quem pagou">
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              {...register("payerGroupMemberId")}
              aria-invalid={!!errors.payerGroupMemberId}
            >
              <option value="">Selecione…</option>
              {members.map((m) => {
                const balance = balanceByMemberId[m.id]?.balanceCents ?? 0;
                const canPay = balance < 0;
                return (
                  <option key={m.id} value={m.id} disabled={!canPay}>
                    {m.name} ({balanceLabel(balance)})
                  </option>
                );
              })}
            </select>
            {errors.payerGroupMemberId && (
              <p className="text-sm text-destructive mt-1">
                {errors.payerGroupMemberId.message}
              </p>
            )}
          </FormControl>
          <FormControl label="Quem recebeu">
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              {...register("recipientGroupMemberId")}
              aria-invalid={!!errors.recipientGroupMemberId}
            >
              <option value="">Selecione…</option>
              {members.map((m) => {
                const balance = balanceByMemberId[m.id]?.balanceCents ?? 0;
                const canReceive = balance > 0;
                const isPayer = m.id === payerGroupMemberId;
                return (
                  <option
                    key={m.id}
                    value={m.id}
                    disabled={!canReceive || isPayer}
                  >
                    {m.name} ({balanceLabel(balance)})
                  </option>
                );
              })}
            </select>
            {errors.recipientGroupMemberId && (
              <p className="text-sm text-destructive mt-1">
                {errors.recipientGroupMemberId.message}
              </p>
            )}
          </FormControl>
          <FormControl label="Valor pago (R$)">
            <Input
              inputMode="decimal"
              placeholder="0,00"
              className="bg-background"
              {...register("amountBrl")}
              aria-invalid={!!errors.amountBrl}
            />
            {maxPaymentCents > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Máximo: {formatPnl(centsToBrl(maxPaymentCents))}
              </p>
            )}
            {errors.amountBrl && (
              <p className="text-sm text-destructive mt-1">
                {String(errors.amountBrl.message)}
              </p>
            )}
          </FormControl>
          <FormControl label="Nota (opcional)">
            <Input
              placeholder="ex.: PIX"
              className="bg-background"
              {...register("note")}
            />
          </FormControl>
          <Button
            type="submit"
            disabled={
              isSubmitting || createMut.isPending || maxPaymentCents === 0
            }
          >
            {createMut.isPending ? "Salvando…" : "Registrar pagamento"}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-display font-semibold">Extrato</h2>
        {!ledgerLoading && snapshot && R.isEmpty(snapshot.entries) && (
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
