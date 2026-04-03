/** Re-export API hooks from models */

export {
  usePlayersQuery,
  useCreatePlayerMutation,
} from "@/models/players/hooks";
export {
  useLocationsQuery,
  useLocationQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
  type LocationWithGameCount,
} from "@/models/locations/hooks";
export {
  useHistoryQuery,
  useGameQuery,
  useCreateGameMutation,
  useFinalizeGameMutation,
  useCreateBuyInMutation,
} from "@/models/games/hooks";
export {
  useGroupsQuery,
  useGroupQuery,
  useGroupMembersQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useAddGroupMemberMutation,
  type GroupWithGameCount,
} from "@/models/groups/hooks";
export { useProfitLossQuery } from "@/models/profit-loss/hooks";
