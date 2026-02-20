import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import Index from "@/pages/Index";
import PlayersPage from "@/pages/PlayersPage";
import NewGamePage from "@/pages/NewGamePage";
import HistoryPage from "@/pages/HistoryPage";
import StandingsPage from "@/pages/StandingsPage";
import NotFound from "@/pages/NotFound";

function RootLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Index,
});

const playersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "players",
  component: PlayersPage,
});

const newGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "new-game",
  component: NewGamePage,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "history",
  component: HistoryPage,
});

const standingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "standings",
  component: StandingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  playersRoute,
  newGameRoute,
  historyRoute,
  standingsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
