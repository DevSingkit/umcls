import type { Config } from "tailwindcss";

const config: Config = {
  // Enforce mobile-first scanning across all app directories
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        13: "3.25rem", // 52px — DESIGN-LMS 2.1 §5.1 form input height (h-13); not in Tailwind's default scale, added 2026-08-31
      },
      fontSize: {
        h1: ["2rem", { lineHeight: "1.2", fontWeight: "700" }],       // 32px
        h2: ["1.5rem", { lineHeight: "1.25", fontWeight: "700" }],    // 24px
        h3: ["1.1875rem", { lineHeight: "1.3", fontWeight: "500" }],  // 19px
        "body-lg": ["1.125rem", { lineHeight: "1.55" }],              // 18px
        "body-md": ["1rem", { lineHeight: "1.5" }],                   // 16px
        "body-emphasis": ["1rem", { lineHeight: "1.5", fontWeight: "500" }],
        caption: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
        label: ["0.875rem", { lineHeight: "1.3", fontWeight: "500" }],
        "data-lg": ["1.75rem", { lineHeight: "1.1", fontWeight: "700" }],
        "data-md": ["1.25rem", { lineHeight: "1.1", fontWeight: "700" }],
        // Mission Mode primary heading / active question prompt only
        // (DESIGN-LMS 2.1 §3 typography table: 22px mobile / 28px desktop,
        // Fredoka, 600/700). Reserved for the ONE headline per Mission
        // Mode screen (mission title, question prompt) — not for section
        // labels within a mission-mode page. No token existed for this
        // before 2026-08-31; added here rather than reusing h1/h2, since
        // those are Classroom Mode's Roboto scale at different sizes.
        mission: ["1.375rem", { lineHeight: "1.2", fontWeight: "600" }],
      },
      colors: {
        // ── Canvas & Core Surfaces ──────────────────────────────
        canvas: "#F7F7F5",   // was "#F4F2EC" — lighter, less beige, cards still read as distinct via border+shadow
        surface: "#FFFFFF",         // Cards, modals, inputs, bottom sheets
        "surface-sunken": "#EAE6DC", // Embedded quiz boxes, track rails
        hairline: "#DCD6C8",        // Default 1px structural borders
        "hairline-strong": "#B8B0A0",// Table header dividers, active input borders

        // ── Typography & Ink ────────────────────────────────────
        ink: "#1A241E",             // Headings & primary body text
        "ink-soft": "#3A463E",        // Secondary text, field descriptions
        "text-secondary": "#5C665E", // Metadata, timestamps, captions
        "text-muted": "#8C948D",    // Placeholders, disabled states
        "on-ink": "#F4F2EC",        // Text over dark backgrounds or buttons

        // ── Chrome / Navigation (Classroom Mode) ────────────────
        sidebar: "#8F1349",         // Deep raspberry-pink header/sidebar
        "sidebar-hover": "#7A1040",   // Sidebar hover state
        "sidebar-active": "#C21A5D",  // Active pill highlight in sidebar

        // ── Action & Brand Colors (Classroom Mode) ──────────────
        brand: {
          DEFAULT: "#128630",       // Classroom primary button / main CTA
          hover: "#0F6D27",         // Button active/hover
          border: "#0A4D20",        // Dark edge for 3D buttons
          soft: "#E1F0E5",          // Success & badge backgrounds
        },

        // ── Mission Mode Palette (Duolingo / Quizizz Style) ─────
        gamified: {
          green: "#58CC02",         // Mission Primary CTA (Check Answer)
          "green-dark": "#46A302",   // 3D bottom border for green button
          purple: "#8854C0",        // Bonus mission / streak highlight
          "purple-dark": "#6C3FB8",  // 3D bottom border for purple button
          blue: "#1CB0F6",          // Active selection outline / info
          "blue-dark": "#0092D6",    // 3D bottom border for blue button
          yellow: "#FFC800",        // XP, stars, streak badges
          "yellow-dark": "#E5B200",  // 3D bottom border for yellow badge
        },

        // ── Feedback & System Alerts ─────────────────────────────
        success: {
          DEFAULT: "#128630",
          soft: "#D7FFB8",          // Quiz correct bottom drawer background
        },
        error: {
          DEFAULT: "#EA2B2B",
          soft: "#FFDFE0",          // Form errors, Quiz incorrect drawer background
          // 3D-button dark edge for incorrect-state CTAs (DESIGN-LMS 2.1
          // §4B.2's "GOT IT" button spec calls for a bg-error button with
          // a border-red-800-style dark border; no such token existed
          // before 2026-08-31). Added, not guessed at — picked to sit
          // the same ~30% darker relationship to `error` that
          // brand-border/gamified-*-dark already keep to their base colors.
          border: "#B91C1C",
        },
        warning: {
          DEFAULT: "#E8963C",
          soft: "#FBEBD6",
        },
        info: {
          DEFAULT: "#3B7EC4",
          soft: "#E1EDF8",
        },
      },
      fontFamily: {
        heading: ["var(--font-fredoka)", "Fredoka", "Roboto", "sans-serif"],
        sans: ["var(--font-nunito)", "Nunito", "Roboto", "sans-serif"],
        document: ["var(--font-roboto)", "Roboto", "sans-serif"],
      },
      borderRadius: {
        md: "12px",                 // Default for cards, forms, and dialogs
        "2xl": "16px",                // Tactile gamified option cards & 3D buttons
        pill: "999px",              // Badges, avatars, floating pills
      },
      boxShadow: {
        card: "0 2px 8px rgba(26, 36, 30, 0.05)",
        "card-hover": "0 4px 16px rgba(26, 36, 30, 0.10)",
        modal: "0 24px 48px rgba(26, 36, 30, 0.18)",
      },
      minHeight: {
        "touch-primary": "56px",    // Primary touch target floor (h-14)
        "touch-secondary": "48px",  // Secondary list row target floor (h-12)
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "drawer-up": "slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;