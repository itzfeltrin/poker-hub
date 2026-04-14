import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type {
  ApiGroupLedgerEntryWithPlayer,
  ApiGroupLedgerSnapshot,
  ApiGroupLedgerManualCreate,
} from "@poker-hub/db";

const ledgerKey = (groupId: string) => ["groups", groupId, "ledger"] as const;

export function useGroupLedgerQuery(groupId: string | undefined) {
  return useQuery({
    queryKey: ledgerKey(groupId ?? ""),
    queryFn: () =>
      api.get<ApiGroupLedgerSnapshot>(`/groups/${groupId}/ledger`),
    enabled: !!groupId,
  });
}

export function useCreateLedgerEntryMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApiGroupLedgerManualCreate) =>
      api.post<ApiGroupLedgerEntryWithPlayer>(`/groups/${groupId}/ledger`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ledgerKey(groupId) });
    },
  });
}
