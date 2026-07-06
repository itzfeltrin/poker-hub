import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Users,
  MapPin,
  UsersRound,
  Plus,
  History,
  TrendingUp,
  Wallet,
  Menu,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGroupScope } from "@/contexts/GroupContext";
import { useGroupsQuery } from "@/api/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@poker-hub/design-system";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Active when pathname equals `to` (or for `/` only exact). */
  match: (pathname: string) => boolean;
};

const mainNavItems: NavItem[] = [
  {
    to: "/",
    label: "Início",
    icon: Home,
    match: (p) => p === "/",
  },
  {
    to: "/players",
    label: "Jogadores",
    icon: Users,
    match: (p) => p === "/players",
  },
  {
    to: "/locations",
    label: "Locais",
    icon: MapPin,
    match: (p) => p.startsWith("/locations"),
  },
  {
    to: "/groups",
    label: "Grupos",
    icon: UsersRound,
    match: (p) => p.startsWith("/groups") && !p.includes("/ledger"),
  },
  {
    to: "/new-game",
    label: "Nova partida",
    icon: Plus,
    match: (p) => p === "/new-game",
  },
  {
    to: "/history",
    label: "Histórico",
    icon: History,
    match: (p) => p === "/history",
  },
  {
    to: "/standings",
    label: "Classificação",
    icon: TrendingUp,
    match: (p) => p === "/standings",
  },
];

function ledgerPathMatch(pathname: string): boolean {
  return /\/groups\/[^/]+\/ledger/.test(pathname);
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { selectedGroupId, setSelectedGroupId } = useGroupScope();
  const { data: groups = [] } = useGroupsQuery();
  const [navOpen, setNavOpen] = useState(false);

  const closeNav = () => setNavOpen(false);

  const handleGroupChange = (value: string) => {
    const nextGroupId = value === "all" ? null : value;
    setSelectedGroupId(nextGroupId);

    if (!ledgerPathMatch(pathname)) return;

    if (nextGroupId) {
      navigate({
        to: "/groups/$groupId/ledger",
        params: { groupId: nextGroupId },
      });
      return;
    }

    navigate({ to: "/groups" });
  };

  useEffect(() => {
    const match = pathname.match(/\/groups\/([^/]+)\/ledger/);
    if (!match) return;
    const ledgerGroupId = match[1];
    if (ledgerGroupId !== selectedGroupId) {
      setSelectedGroupId(ledgerGroupId);
    }
  }, [pathname, selectedGroupId, setSelectedGroupId]);

  return (
    <div className="min-h-screen bg-felt flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container px-4 sm:px-8 flex flex-col gap-3 py-3 md:py-0 md:h-16 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Sheet open={navOpen} onOpenChange={setNavOpen}>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label="Abrir menu de navegação"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="flex h-full max-h-[100dvh] w-full flex-col gap-0 border-l p-0 sm:max-w-md"
                >
                  <SheetHeader className="border-b border-border px-6 py-4 text-left">
                    <SheetTitle className="font-display">Navegação</SheetTitle>
                  </SheetHeader>
                  <nav
                    className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4"
                    aria-label="Principal"
                  >
                    {mainNavItems.map((item) => {
                      const active = item.match(pathname);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={closeNav}
                          className={cn(
                            "relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                    {selectedGroupId ? (
                      <Link
                        to="/groups/$groupId/ledger"
                        params={{ groupId: selectedGroupId }}
                        onClick={closeNav}
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                          ledgerPathMatch(pathname)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                        )}
                      >
                        <Wallet className="h-5 w-5 shrink-0" />
                        Bolão
                      </Link>
                    ) : (
                      <Link
                        to="/groups"
                        onClick={closeNav}
                        className="relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                        title="Selecione um grupo no filtro para abrir o bolão deste grupo"
                      >
                        <Wallet className="h-5 w-5 shrink-0 opacity-70" />
                        <span className="flex flex-col items-start gap-0.5">
                          <span>Bolão</span>
                          <span className="text-xs font-normal text-muted-foreground/90">
                            Escolha um grupo no filtro
                          </span>
                        </span>
                      </Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
              <Link to="/" className="flex items-center gap-2 min-w-0">
                <img
                  src="/logo_transparent.png"
                  alt="Logo"
                  className="h-12 shrink-0"
                />
              </Link>
            </div>
            <label className="flex items-center gap-2 md:hidden text-sm text-muted-foreground min-w-0">
              <span className="sr-only">Grupo</span>
              <select
                className={cn(
                  "rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground max-w-[min(55vw,14rem)]",
                )}
                value={selectedGroupId ?? "all"}
                onChange={(e) => handleGroupChange(e.target.value)}
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
                onChange={(e) => handleGroupChange(e.target.value)}
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
          </div>
        </div>
      </header>

      <main className="flex-1 container px-4 sm:px-8 py-8 pb-28 md:pb-8">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile: atalhos + menu já no topo */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm z-40 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="Atalhos"
      >
        <div className="grid grid-cols-3 max-w-lg mx-auto">
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-2.5 text-xs transition-colors",
              pathname === "/" ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Home className="h-5 w-5" />
            Início
          </Link>
          <Link
            to="/new-game"
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-2.5 text-xs transition-colors",
              pathname === "/new-game" ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Plus className="h-5 w-5" />
            Nova partida
          </Link>
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Abrir menu completo"
          >
            <Menu className="h-5 w-5" />
            Menu
          </button>
        </div>
      </nav>
    </div>
  );
}
