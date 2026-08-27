import { createFileRoute } from "@tanstack/react-router";
import SpeakGamePage from "@/pages/SpeakGamePage";

export const Route = createFileRoute("/new-game/speak")({
  component: SpeakGamePage,
});
