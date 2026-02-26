export type ApiProfitLossPlayer = {
  playerId: string;
  name: string;
  totalBuyIn: number;
  totalCashOut: number;
  profitLoss: number;
};

export type ApiProfitLossResponse = {
  period: string;
  startDate?: string;
  endDate?: string;
  players: ApiProfitLossPlayer[];
};
