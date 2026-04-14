import { Outlet, createFileRoute } from "@tanstack/react-router";

function GroupIdLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/groups/$groupId")({
  component: GroupIdLayout,
});
