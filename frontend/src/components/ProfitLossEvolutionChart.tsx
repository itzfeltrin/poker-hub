import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as R from "remeda";
import type { PeriodFilter } from "@poker-hub/db";
import { useProfitLossSeriesQuery } from "@/api/hooks";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "all_time", label: "Todo o período" },
  { value: "last_7_days", label: "Últimos 7 dias" },
  { value: "last_month", label: "Último mês" },
  { value: "last_year", label: "Último ano" },
];

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
] as const;

type PlayerOption = {
  id: string;
  name: string;
};

type ProfitLossEvolutionChartProps = {
  groupId: string | null;
  championshipId: string | null;
  players: PlayerOption[];
};

function formatTickDate(value: string): string {
  const d = new Date(value);
  const utcDay = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return format(utcDay, "d MMM", { locale: ptBR });
}

function formatTooltipDate(value: string): string {
  const d = new Date(value);
  const utcDay = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return format(utcDay, "d MMM yyyy", { locale: ptBR });
}

export function ProfitLossEvolutionChart({
  groupId,
  championshipId,
  players,
}: ProfitLossEvolutionChartProps) {
  const [period, setPeriod] = useState<PeriodFilter>("all_time");
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) return;
    if (!R.isIncludedIn(playerId, R.map(players, (p) => p.id))) {
      setPlayerId(null);
    }
  }, [players, playerId]);

  useEffect(() => {
    if (championshipId) setPeriod("all_time");
  }, [championshipId]);

  const { data, isLoading, isError } = useProfitLossSeriesQuery({
    period,
    groupId,
    championshipId,
    playerId,
  });

  const chartConfig = useMemo(() => {
    const seriesPlayers = data?.players ?? [];
    return Object.fromEntries(
      seriesPlayers.map((player, index) => [
        player.id,
        {
          label: player.name,
          color: CHART_COLORS[index % CHART_COLORS.length],
        },
      ]),
    ) as ChartConfig;
  }, [data?.players]);

  const chartData = useMemo(() => {
    if (!data?.points) return [];
    return R.map(data.points, (point) =>
      R.pipe(
        point.values,
        R.map((v) => [v.playerId, v.profitLoss] as const),
        Object.fromEntries,
        (values) => ({
          date: point.date,
          gameId: point.gameId,
          ...values,
        }),
      ),
    );
  }, [data?.points]);

  const seriesKeys = R.map(data?.players ?? [], (p) => p.id);

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display font-semibold text-lg">Evolução</h2>
          <p className="text-sm text-muted-foreground">
            Lucro e perda acumulados por partida
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <label className="flex items-center gap-2 min-w-0">
            <span>Jogador</span>
            <select
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground max-w-[11rem]"
              value={playerId ?? "all"}
              onChange={(e) =>
                setPlayerId(e.target.value === "all" ? null : e.target.value)
              }
              aria-label="Filtrar por jogador"
            >
              <option value="all">Todos</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 min-w-0">
            <span>Período</span>
            <select
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground max-w-[12rem]"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              aria-label="Filtrar por período"
              disabled={Boolean(championshipId)}
              title={
                championshipId
                  ? "O campeonato selecionado define o intervalo"
                  : undefined
              }
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading && (
        <p className="text-muted-foreground py-10 text-center text-sm">
          Carregando evolução…
        </p>
      )}

      {isError && (
        <p className="text-loss py-10 text-center text-sm">
          Não foi possível carregar a evolução.
        </p>
      )}

      {!isLoading && !isError && chartData.length === 0 && (
        <p className="text-muted-foreground py-10 text-center text-sm">
          Nenhuma partida finalizada neste filtro.
        </p>
      )}

      {!isLoading && !isError && chartData.length > 0 && (
        <ChartContainer config={chartConfig} className="aspect-[16/9] w-full">
          <LineChart
            data={chartData}
            margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={formatTickDate}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tickFormatter={(value: number) =>
                formatCurrency(value).replace(/\s/g, "")
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) =>
                    typeof label === "string" ? formatTooltipDate(label) : label
                  }
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig[String(name)]?.label ?? name}
                      </span>
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {typeof value === "number"
                          ? formatCurrency(value)
                          : value}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {seriesKeys.map((playerKey) => (
              <Line
                key={playerKey}
                type="monotone"
                dataKey={playerKey}
                stroke={`var(--color-${playerKey})`}
                strokeWidth={2}
                dot={seriesKeys.length === 1}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      )}
    </section>
  );
}
