export type Player = {
  id: string
  name: string
}

export type GamePlayer = {
  player_id: string
  name: string
  initial_chips: number
  final_chips: number | null
}

export type Game = {
  id: string
  date: string
  buy_in: number
  chips_per_player: number
  finished: boolean
  players: GamePlayer[]
}

export type ProfitLossItem = {
  player_id: string
  name: string
  total_buy_in: number
  total_cash_out: number
  profit_loss: number
}

export type ProfitLossResponse = {
  period: string
  start_date?: string
  end_date?: string
  players: ProfitLossItem[]
}

export type ErrorResponse = { error: string }
