import { createFileRoute } from '@tanstack/react-router'
import { useProfitLoss } from '../api/hooks'
import { formatCurrency } from '../utils/currency'
import { useState } from 'react'

const PERIODS = [
  { value: 'all_time', label: 'Todo o período' },
  { value: 'last_7_days', label: 'Últimos 7 dias' },
  { value: 'last_month', label: 'Último mês' },
  { value: 'last_year', label: 'Último ano' },
  { value: 'custom', label: 'Personalizado' },
] as const

export const Route = createFileRoute('/profit-loss')({
  component: ProfitLossPage,
})

function ProfitLossPage() {
  const [period, setPeriod] = useState('all_time')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading, error } = useProfitLoss(
    period,
    period === 'custom' ? startDate || undefined : undefined,
    period === 'custom' ? endDate || undefined : undefined
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Lucros e perdas</h1>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Período</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {period === 'custom' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700">Data início</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Data fim</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </>
        )}
      </div>

      {isLoading && <p className="mt-6 text-slate-500">Carregando…</p>}
      {error && <p className="mt-6 text-red-600">Erro ao carregar.</p>}
      {data && data.players.length === 0 && (
        <p className="mt-6 text-slate-500">Nenhum dado no período.</p>
      )}
      {data && data.players.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-800">Jogador</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-800">Entrada</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-800">Saída</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-800">Lucro / Perda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.players.map((player) => (
                <tr key={player.player_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{player.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(player.total_buy_in)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(player.total_cash_out)}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      player.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {player.profit_loss >= 0 ? '+' : ''}{formatCurrency(player.profit_loss)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
