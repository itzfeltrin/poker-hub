import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { GroupScopeProvider } from "@/contexts/GroupContext";
import NotFound from "@/pages/NotFound";

function RootComponent() {
  return (
    <GroupScopeProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </GroupScopeProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});
