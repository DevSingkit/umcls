import type { Config } from "tailwindcss";
// Tokens pulled directly from DESIGN-LMS.md v1.0 (the "UMCLSI Classroom
// Design System"), sections 2-4. This replaces the old Mastercard-style
// palette entirely. Do not hand-tune these — if a token is wrong, fix it
// in DESIGN-LMS.md first, then mirror the change here.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Canvas & surfaces
        canvas: "#F7F5F0",
        surface: "#FFFFFF",
        "surface-sunken": "#EFEBE3",
        hairline: "#E2DED4",
        "hairline-strong": "#C9C3B5",

        // Ink (text — used everywhere for headings/body, NOT the sidebar)
        ink: "#1F2A24",
        "ink-soft": "#3F4A43",
        "text-secondary": "#6B7268",
        "text-muted": "#9A9F94",
        "on-ink": "#F7F5F0",

        // Sidebar/chrome — separate from `ink`. `ink` stays the text
        // color everywhere; this is ONLY for structural chrome
        // (Sidebar.tsx's bg-ink usage becomes bg-sidebar).
        sidebar: "#8F1349",
        "sidebar-hover": "#7A1040",
        "sidebar-active": "#C21A5D",

        // Brand — institution green (was schoolhouse green #2E7D46)
        brand: "#128630",
        "brand-hover": "#0F6D27",
        "brand-soft": "#E1F0E5",

        // Warm accent (attention, not alarm)
        amber: "#E8963C",
        "amber-soft": "#FBEBD6",

        // Destructive / consequential
        red: "#C4453A",
        "red-soft": "#F7E2E0",

        // Semantic (mirror brand/amber/red — never repurposed elsewhere)
        success: "#128630",
        "success-soft": "#E1F0E5",
        warning: "#E8963C",
        "warning-soft": "#FBEBD6",
        error: "#C4453A",
        "error-soft": "#F7E2E0",
        info: "#3B7EC4",
        "info-soft": "#E1EDF8",

        // Role accents (badges/avatars only, never buttons)
        "role-admin": "#5B6472",
        "role-teacher": "#128630",
        "role-student": "#3B7EC4",
      },
      fontFamily: {
        // Both headings and body now use Roboto — matches Google
        // Classroom's actual font choice, replacing the earlier
        // Nunito/Inter pairing. Two separate next/font declarations
        // (see app/layout.tsx) so heading weights (500/700) and body
        // weights (400/500) each load only what they need.
        heading: ["var(--font-roboto-heading)", "Roboto", "system-ui", "sans-serif"],
        sans: ["var(--font-roboto-body)", "Roboto", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Headings (Roboto — only ships 400/500/700/900, no 600/800, so
        // h1 maps to 700 instead of the old Nunito 800)
        h1: ["2rem", { lineHeight: "1.2", fontWeight: "700" }], // 32px
        h2: ["1.5rem", { lineHeight: "1.25", fontWeight: "700" }], // 24px
        h3: ["1.1875rem", { lineHeight: "1.3", fontWeight: "500" }], // 19px

        // Body (Roboto — body-emphasis/label map to 500, the closest
        // real cut to the old Inter 600)
        "body-lg": ["1.125rem", { lineHeight: "1.55" }], // 18px — lesson/re-teach reading content
        "body-md": ["1rem", { lineHeight: "1.5" }], // 16px — standard, minimum size anywhere
        "body-emphasis": ["1rem", { lineHeight: "1.5", fontWeight: "500" }],
        caption: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
        label: ["0.875rem", { lineHeight: "1.3", fontWeight: "500" }],

        // Data
        "data-lg": ["1.75rem", { lineHeight: "1.1", fontWeight: "700" }], // dashboard stat numbers
        "data-md": ["1.25rem", { lineHeight: "1.1", fontWeight: "700" }], // grade numbers
      },
      spacing: {
        xxs: "4px",
        xs: "8px",
        sm: "16px",
        md: "24px",
        lg: "32px",
        xl: "48px",
        xxl: "64px",
      },
      borderRadius: {
        // Only two radii, per DESIGN-LMS.md §4 — everything is either a
        // soft rectangle (md) or a full pill. No in-between values.
        md: "12px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(31, 42, 36, 0.06)",
        "card-hover": "0 4px 16px rgba(31, 42, 36, 0.10)",
        modal: "0 24px 48px rgba(31, 42, 36, 0.18)",
      },
    },
  },
  plugins: [],
};
export default config;