/**
 * Converts a camelCase string to snake_case.
 * Used to derive API (snake_case) types from Drizzle row types (camelCase).
 */
export type CamelToSnake<T extends string> = T extends `${infer P1}${infer P2}`
  ? P2 extends Uncapitalize<P2>
    ? `${Lowercase<P1>}${CamelToSnake<P2>}`
    : `${Lowercase<P1>}_${CamelToSnake<Uncapitalize<P2>>}`
  : Lowercase<T>;

/**
 * Maps a Drizzle row type (camelCase keys) to the API shape (snake_case keys).
 * Add new columns in the schema only; this type stays in sync automatically.
 */
export type RowToApi<T> = {
  [K in keyof T as CamelToSnake<K & string>]: T[K];
};
