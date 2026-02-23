import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiProfitLossResponse } from "@shared/models/profit-loss/types";

const QUERY_KEYS = {
  profitLoss: (params: {
    period?: string;
    start_date?: string;
    end_date?: string;
  }) => ["profit-loss", params] as const,
};

export function useProfitLossQuery(params?: {
  period?: string;
  start_date?: string;
  end_date?: string;
}) {
  const search = new URLSearchParams();
  if (params?.period) search.set("period", params.period);
  if (params?.start_date) search.set("start_date", params.start_date);
  if (params?.end_date) search.set("end_date", params.end_date);
  const query = search.toString();
  return useQuery({
    queryKey: QUERY_KEYS.profitLoss(params ?? {}),
    queryFn: () =>
      api.get<ApiProfitLossResponse>(
        "/profit-loss" + (query ? `?${query}` : ""),
      ),
  });
}
