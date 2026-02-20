import { createFileRoute } from '@tanstack/react-router'
import { usePlayers, useCreatePlayer } from '../api/hooks'
import { useState } from 'react'

export const Route = createFileRoute('/players')({
  component: PlayersPage,
})

function PlayersPage() {
  const { data: list, isLoading, error } = usePlayers()
  const create = useCreatePlayer()
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate(name.trim(), {
      onSuccess: () => setName(''),
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Jogadores</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do jogador"
          className="rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {create.isPending ? 'Criando…' : 'Adicionar'}
        </button>
      </form>
      {create.isError && (
        <p className="mt-2 text-sm text-red-600">{(create.error as Error).message}</p>
      )}

      {isLoading && <p className="mt-4 text-slate-500">Carregando…</p>}
      {error && <p className="mt-4 text-red-600">Erro ao carregar jogadores.</p>}
      {list && list.length === 0 && (
        <p className="mt-4 text-slate-500">Nenhum jogador cadastrado.</p>
      )}
      {list && list.length > 0 && (
        <ul className="mt-6 space-y-2">
          {list.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <span className="font-medium">{player.name}</span>
              <span className="text-xs text-slate-400">{player.id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
