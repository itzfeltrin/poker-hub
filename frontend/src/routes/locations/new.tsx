import { createFileRoute } from "@tanstack/react-router";
import NewLocationPage from "@/pages/NewLocationPage";

export const Route = createFileRoute("/locations/new")({
  component: NewLocationPage,
});
