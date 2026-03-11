export const spacing = {
  "page-x": "1.5rem",
  "page-y": "2rem",
  section: "2.5rem",
  "stack-sm": "0.5rem",
  stack: "1rem",
  "stack-lg": "1.5rem",
  inline: "0.5rem",
} as const;

export type SpacingToken = keyof typeof spacing;
