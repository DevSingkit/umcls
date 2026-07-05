import type { Config } from "tailwindcss";
// Tokens pulled directly from DESIGN-LMS.md §1.2 / §1.3.
// Do not hand-tune these — if a token is wrong, fix it in DESIGN-LMS.md
// first, then mirror the change here, so the doc stays the source of truth.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: "#024ad8",
        "primary-bright": "#296ef9",
        "primary-deep": "#0e3191",
        "primary-soft": "#c9e0fc",
        "on-primary": "#ffffff",
        // Ink
        ink: "#1a1a1a",
        "ink-deep": "#000000",
        "ink-soft": "#292929",
        "on-ink": "#ffffff",
        // Surfaces
        canvas: "#ffffff",
        paper: "#ffffff",
        cloud: "#f7f7f7",
        fog: "#e8e8e8",
        hairline: "#e8e8e8",
        "hairline-strong": "#c2c2c2",
        // Neutrals
        steel: "#c2c2c2",
        graphite: "#636363",
        charcoal: "#3d3d3d",
        link: "#024ad8",
        "link-pressed": "#0e3191",
        // Semantic
        success: "#1a7a4a",
        "success-soft": "#d4f5e3",
        warning: "#b45309",
        "warning-soft": "#fef3c7",
        error: "#b3262b",
        "error-soft": "#f9d4d2",
        info: "#024ad8",
        // Role accents
        "role-admin": "#356373",
        "role-teacher": "#1a1a1a",
        "role-student": "#c9e0fc",
        // Grade spectrum (V1 note: only pass/fail is needed for the MCQ/TF
        // results screen — these letter-grade bands are here for when V2's
        // full gradebook needs them, harmless to have now)
        "grade-a": "#1a7a4a",
        "grade-b": "#2563eb",
        "grade-c": "#b45309",
        "grade-d": "#b3262b",
      },
      fontFamily: {
        sans: ['"Forma DJR Micro"', '"Inter"', "system-ui", "sans-serif"],
      },
      // Everything below is new. The old config only had colors and one
      // font, so any class like text-display-xs or rounded-hero used in
      // the admin page did not exist and was silently ignored by the
      // browser. That is why the page looked plain. These additions give
      // real meaning to the class names already used in that page, built
      // from the same scale logic as the rest of DESIGN-LMS.md.
      fontSize: {
        "display-xs": ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
        "label-md": ["0.75rem", { lineHeight: "1rem", fontWeight: "600" }],
        "caption-md": ["0.8125rem", { lineHeight: "1.125rem" }],
      },
      spacing: {
        md: "1rem",
        xxl: "3rem",
      },
      borderRadius: {
        button: "0.5rem",
        hero: "1rem",
      },
      boxShadow: {
        "card-lift": "0 4px 16px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
export default config;