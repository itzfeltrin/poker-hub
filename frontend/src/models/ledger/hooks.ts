import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type {
  ApiAllGroupsLedgerSnapshot,
  ApiGroupLedgerCreateResult,
  ApiGroupLedgerEntryWithPlayer,
  ApiGroupLedgerManualCreate,
  ApiGroupLedgerSnapshot,
  ApiGroupMemberBalance,
} from "@poker-hub/db";

const allLedgerKey = ["groups", "ledger", "all"] as const;
const ledgerKey = (groupId: string) => ["groups", groupId, "ledger"] as const;

/** Normalized ledger view: group fields present only in the all-groups response. */
export type LedgerSnapshot = {
  balances: Array<ApiGroupMemberBalance & { groupName?: string }>;
  entries: Array<ApiGroupLedgerEntryWithPlayer & { groupName?: string }>;
};

export function useLedgerQuery(groupId: string | null | undefined) {
  const isScoped = !!groupId;
  return useQuery({
    queryKey: isScoped ? ledgerKey(groupId) : allLedgerKey,
    queryFn: async (): Promise<LedgerSnapshot> => {
      if (isScoped) {
        return api.get<ApiGroupLedgerSnapshot>(`/groups/${groupId}/ledger`);
      }
      return api.get<ApiAllGroupsLedgerSnapshot>(`/groups/ledger`);
    },
  });
}

/** @deprecated Use useLedgerQuery */
export function useGroupLedgerQuery(groupId: string | undefined) {
  return useLedgerQuery(groupId);
}

export function useCreateLedgerEntryMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApiGroupLedgerManualCreate) =>
      api.post<ApiGroupLedgerCreateResult>(`/groups/${groupId}/ledger`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ledgerKey(groupId) });
      qc.invalidateQueries({ queryKey: allLedgerKey });
    },
  });
}
