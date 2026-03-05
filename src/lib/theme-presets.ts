export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  /** Preview swatch color (oklch for light mode) */
  swatch: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "neutral",
    name: "Neutral",
    description: "Clean grayscale, zero chroma",
    swatch: "oklch(0.205 0 0)",
  },
  {
    id: "zinc",
    name: "Zinc",
    description: "Cool gray with subtle blue undertone",
    swatch: "oklch(0.442 0.017 285.786)",
  },
  {
    id: "slate",
    name: "Slate",
    description: "Blue-gray, professional",
    swatch: "oklch(0.446 0.043 257.281)",
  },
  {
    id: "stone",
    name: "Stone",
    description: "Warm gray with earthy undertone",
    swatch: "oklch(0.444 0.011 73.639)",
  },
  {
    id: "blue",
    name: "Blue",
    description: "Classic corporate blue",
    swatch: "oklch(0.546 0.245 262.881)",
  },
  {
    id: "green",
    name: "Green",
    description: "Fresh, growth-oriented",
    swatch: "oklch(0.527 0.154 150.069)",
  },
  {
    id: "rose",
    name: "Rose",
    description: "Warm, energetic pink-red",
    swatch: "oklch(0.554 0.194 15.723)",
  },
  {
    id: "orange",
    name: "Orange",
    description: "Warm, friendly and inviting",
    swatch: "oklch(0.554 0.195 38.402)",
  },
];

export type ColorThemeId = (typeof THEME_PRESETS)[number]["id"];
