import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiProfitLoss } from "@poker-hub/db";

const QUERY_KEYS = {
  profitLoss: (params: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }) => ["profit-loss", params] as const,
};

export function useProfitLossQuery(params?: {
  period?: string;
  startDate?: string;
  endDate?: string;
}) {
  const search = new URLSearchParams();
  if (params?.period) search.set("period", params.period);
  if (params?.startDate) search.set("startDate", params.startDate);
  if (params?.endDate) search.set("endDate", params.endDate);
  const query = search.toString();
  return useQuery({
    queryKey: QUERY_KEYS.profitLoss(params ?? {}),
    queryFn: () =>
      api.get<ApiProfitLoss>("/profit-loss" + (query ? `?${query}` : "")),
  });
}
