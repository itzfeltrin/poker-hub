import { createFileRoute } from "@tanstack/react-router";
import GroupLedgerPage from "@/pages/GroupLedgerPage";

export const Route = createFileRoute("/groups/$groupId/ledger")({
  component: GroupLedgerPage,
});
