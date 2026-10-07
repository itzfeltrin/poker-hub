import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiProfitLoss, ApiProfitLossSeries, PeriodFilter } from "@poker-hub/db";

type ProfitLossParams = {
  period?: PeriodFilter | string;
  startDate?: string;
  endDate?: string;
  groupId?: string | null;
  championshipId?: string | null;
  playerId?: string | null;
};

const QUERY_KEYS = {
  profitLoss: (params: {
    period?: string;
    startDate?: string;
    endDate?: string;
    groupId?: string | null;
    championshipId?: string | null;
  }) => ["profit-loss", params] as const,
  profitLossSeries: (params: {
    period?: string;
    startDate?: string;
    endDate?: string;
    groupId?: string | null;
    championshipId?: string | null;
    playerId?: string | null;
  }) => ["profit-loss-series", params] as const,
};

function buildProfitLossSearch(params?: ProfitLossParams): string {
  const search = new URLSearchParams();
  if (params?.period) search.set("period", params.period);
  if (params?.startDate) search.set("startDate", params.startDate);
  if (params?.endDate) search.set("endDate", params.endDate);
  if (params?.groupId) search.set("groupId", params.groupId);
  if (params?.groupId && params?.championshipId) {
    search.set("championshipId", params.championshipId);
  }
  if (params?.playerId) search.set("playerId", params.playerId);
  return search.toString();
}

export function useProfitLossQuery(params?: ProfitLossParams) {
  const query = buildProfitLossSearch(params);
  const keyParams = {
    period: params?.period,
    startDate: params?.startDate,
    endDate: params?.endDate,
    groupId: params?.groupId ?? null,
    championshipId: params?.championshipId ?? null,
  };
  return useQuery({
    queryKey: QUERY_KEYS.profitLoss(keyParams),
    queryFn: () =>
      api.get<ApiProfitLoss>("/profit-loss" + (query ? `?${query}` : "")),
  });
}

export function useProfitLossSeriesQuery(params?: ProfitLossParams) {
  const query = buildProfitLossSearch(params);
  const keyParams = {
    period: params?.period,
    startDate: params?.startDate,
    endDate: params?.endDate,
    groupId: params?.groupId ?? null,
    championshipId: params?.championshipId ?? null,
    playerId: params?.playerId ?? null,
  };
  return useQuery({
    queryKey: QUERY_KEYS.profitLossSeries(keyParams),
    queryFn: () =>
      api.get<ApiProfitLossSeries>(
        "/profit-loss/series" + (query ? `?${query}` : ""),
      ),
  });
}
