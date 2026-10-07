import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiProfitLoss } from "@poker-hub/db";

const QUERY_KEYS = {
  profitLoss: (params: {
    period?: string;
    startDate?: string;
    endDate?: string;
    groupId?: string | null;
    championshipId?: string | null;
  }) => ["profit-loss", params] as const,
};

export function useProfitLossQuery(params?: {
  period?: string;
  startDate?: string;
  endDate?: string;
  groupId?: string | null;
  championshipId?: string | null;
}) {
  const search = new URLSearchParams();
  if (params?.period) search.set("period", params.period);
  if (params?.startDate) search.set("startDate", params.startDate);
  if (params?.endDate) search.set("endDate", params.endDate);
  if (params?.groupId) search.set("groupId", params.groupId);
  if (params?.groupId && params?.championshipId) {
    search.set("championshipId", params.championshipId);
  }
  const query = search.toString();
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
