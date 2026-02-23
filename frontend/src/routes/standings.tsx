import { createFileRoute } from "@tanstack/react-router";
import StandingsPage from "@/pages/StandingsPage";

export const Route = createFileRoute("/standings")({
  component: StandingsPage,
});
