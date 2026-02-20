import { createFileRoute, Link } from '@tanstack/react-router'
import { useGames } from '../api/hooks'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
})

function HistoryPage() {
  const { data: games, isLoading, error } = useGames()

  if (isLoading) return <p className="text-slate-500">Carregando…</p>
  if (error) return <p className="text-red-600">Erro ao carregar histórico.</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Histórico de partidas</h1>
      {games && games.length === 0 && (
        <p className="mt-4 text-slate-500">Nenhuma partida ainda.</p>
      )}
      {games && games.length > 0 && (
        <ul className="mt-6 space-y-4">
          {games.map((game) => (
            <li
              key={game.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {new Date(game.date).toLocaleDateString('pt-BR')} — Buy-in {game.buy_in} · {game.chips_per_player} fichas/jogador
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    game.finished ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {game.finished ? 'Finalizada' : 'Em andamento'}
                </span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {game.players.map((player) => (
                  <li key={player.player_id} className="text-sm text-slate-700">
                    {player.name}
                    {player.final_chips != null && (
                      <span className="ml-1 text-slate-500">({player.final_chips} fichas)</span>
                    )}
                  </li>
                ))}
              </ul>
              <Link
                to="/games/$id"
                params={{ id: game.id }}
                className="mt-2 inline-block text-sm font-medium text-green-600 hover:text-green-700"
              >
                Ver partida →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
