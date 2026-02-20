import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const players = {
  list: () => api.get<import('./types').Player[]>('/players'),
  get: (id: string) => api.get<import('./types').Player>(`/players/${id}`),
  create: (name: string) => api.post<import('./types').Player>('/players', { name }),
}

export const games = {
  list: () => api.get<import('./types').Game[]>('/history'),
  get: (id: string) => api.get<import('./types').Game>(`/games/${id}`),
  create: (body: { buy_in: number; chips_per_player: number; player_ids: string[] }) =>
    api.post<import('./types').Game>('/games', body),
  finalize: (id: string, final_chips: Record<string, number>) =>
    api.patch<import('./types').Game>(`/games/${id}/finalize`, { final_chips }),
}

export const profitLoss = {
  get: (params?: { period?: string; start_date?: string; end_date?: string }) =>
    api.get<import('./types').ProfitLossResponse>('/profit-loss', { params }),
}
