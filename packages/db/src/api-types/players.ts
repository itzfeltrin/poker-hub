import type { PlayerRow } from "../schema";

export type ApiPlayer = PlayerRow;

export type ApiPlayerCreate = Omit<PlayerRow, "id">;
