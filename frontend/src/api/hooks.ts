/** Re-export API hooks from models */

export {
  usePlayersQuery,
  useCreatePlayerMutation,
} from "@/models/players/hooks";
export {
  useHistoryQuery,
  useGameQuery,
  useCreateGameMutation,
  useFinalizeGameMutation,
} from "@/models/games/hooks";
export { useProfitLossQuery } from "@/models/profit-loss/hooks";
