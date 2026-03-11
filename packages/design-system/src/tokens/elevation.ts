export const elevation = {
  card: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
  "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  dropdown: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  modal: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
} as const;

export type ElevationToken = keyof typeof elevation;
