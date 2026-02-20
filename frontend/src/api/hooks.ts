import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { players as playersApi, games as gamesApi, profitLoss as profitLossApi } from './client'

export const playerKeys = { all: ['players'] as const }
export const gameKeys = { all: ['history'] as const, detail: (id: string) => ['game', id] as const }
export const profitLossKeys = (period?: string) => ['profit-loss', period] as const

export function usePlayers() {
  return useQuery({
    queryKey: playerKeys.all,
    queryFn: async () => {
      const { data } = await playersApi.list()
      return data
    },
  })
}

export function useCreatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => playersApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: playerKeys.all }),
  })
}

export function useGames() {
  return useQuery({
    queryKey: gameKeys.all,
    queryFn: async () => {
      const { data } = await gamesApi.list()
      return data
    },
  })
}

export function useGame(id: string | undefined) {
  return useQuery({
    queryKey: gameKeys.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await gamesApi.get(id!)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateGame() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { buy_in: number; chips_per_player: number; player_ids: string[] }) =>
      gamesApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: gameKeys.all }),
  })
}

export function useFinalizeGame() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, final_chips }: { id: string; final_chips: Record<string, number> }) =>
      gamesApi.finalize(id, final_chips),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: gameKeys.all })
      qc.invalidateQueries({ queryKey: gameKeys.detail(id) })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
    },
  })
}

export function useProfitLoss(period: string = 'all_time', startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: profitLossKeys(period),
    queryFn: async () => {
      const { data } = await profitLossApi.get(
        period === 'custom' ? { period, start_date: startDate, end_date: endDate } : { period }
      )
      return data
    },
  })
}
