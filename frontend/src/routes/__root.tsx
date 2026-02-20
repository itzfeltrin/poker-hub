import { Outlet, Link, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-6">
          <Link to="/" className="font-semibold text-slate-800 hover:text-slate-600">
            Poker Hub
          </Link>
          <Link to="/players" className="text-slate-600 hover:text-slate-900" activeProps={{ className: 'font-medium text-slate-900' }}>
            Jogadores
          </Link>
          <Link to="/games" className="text-slate-600 hover:text-slate-900" activeProps={{ className: 'font-medium text-slate-900' }}>
            Partidas
          </Link>
          <Link to="/history" className="text-slate-600 hover:text-slate-900" activeProps={{ className: 'font-medium text-slate-900' }}>
            Histórico
          </Link>
          <Link to="/profit-loss" className="text-slate-600 hover:text-slate-900" activeProps={{ className: 'font-medium text-slate-900' }}>
            Lucros e perdas
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
