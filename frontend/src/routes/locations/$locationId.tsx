import { createFileRoute } from "@tanstack/react-router";
import LocationDetailsPage from "@/pages/LocationDetailsPage";

export const Route = createFileRoute("/locations/$locationId")({
  component: LocationDetailsPage,
});
