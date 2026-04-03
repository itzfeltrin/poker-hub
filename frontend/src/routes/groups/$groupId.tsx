import { createFileRoute } from "@tanstack/react-router";
import GroupDetailsPage from "@/pages/GroupDetailsPage";

export const Route = createFileRoute("/groups/$groupId")({
  component: GroupDetailsPage,
});
