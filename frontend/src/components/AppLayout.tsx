import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Users,
  MapPin,
  UsersRound,
  Plus,
  History,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGroupScope } from "@/contexts/GroupContext";
import { useGroupsQuery } from "@/api/hooks";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/players", label: "Jogadores", icon: Users },
  { to: "/locations", label: "Locais", icon: MapPin },
  { to: "/groups", label: "Grupos", icon: UsersRound },
  { to: "/new-game", label: "Nova partida", icon: Plus },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/standings", label: "Classificação", icon: TrendingUp },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { selectedGroupId, setSelectedGroupId } = useGroupScope();
  const { data: groups = [] } = useGroupsQuery();

  return (
    <div className="min-h-screen bg-felt flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container px-4 sm:px-8 flex flex-col gap-3 py-3 md:py-0 md:h-16 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src="/logo_transparent.png" alt="Logo" className="h-12" />
            </Link>
            <label className="flex items-center gap-2 md:hidden text-sm text-muted-foreground">
              <span className="sr-only">Grupo</span>
              <select
                className={cn(
                  "rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground max-w-[55vw]",
                )}
                value={selectedGroupId ?? "all"}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedGroupId(v === "all" ? null : v);
                }}
                aria-label="Filtrar por grupo"
              >
                <option value="all">Todos os grupos</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="hidden md:flex items-center gap-3 flex-1 justify-end min-w-0">
            <label className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              Grupo
              <select
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground max-w-[200px]"
                value={selectedGroupId ?? "all"}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedGroupId(v === "all" ? null : v);
                }}
                aria-label="Filtrar por grupo"
              >
                <option value="all">Todos os grupos</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.gameCount})
                  </option>
                ))}
              </select>
            </label>
            <nav className="flex items-center gap-1 min-w-0 overflow-x-auto">
              {navItems.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                    {active && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                        transition={{ type: "spring", duration: 0.4 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 container px-4 sm:px-8 py-8 pb-24 md:pb-8">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
