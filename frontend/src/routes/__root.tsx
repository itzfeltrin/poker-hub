import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import NotFound from "@/pages/NotFound";

function RootComponent() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});
