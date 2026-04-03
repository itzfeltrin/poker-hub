import { createFileRoute } from "@tanstack/react-router";
import NewGroupPage from "@/pages/NewGroupPage";

export const Route = createFileRoute("/groups/new")({
  component: NewGroupPage,
});
