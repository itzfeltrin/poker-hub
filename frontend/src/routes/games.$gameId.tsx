import { createFileRoute } from "@tanstack/react-router";
import GameDetailsPage from "@/pages/GameDetailsPage";

export const Route = createFileRoute("/games/$gameId")({
  component: GameDetailsPage,
});
