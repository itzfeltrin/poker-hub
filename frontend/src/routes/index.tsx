import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Poker Hub</h1>
      <p className="mt-2 text-slate-600">
        Gerencie jogadores, partidas e acompanhe lucros e perdas.
      </p>
    </div>
  )
}
