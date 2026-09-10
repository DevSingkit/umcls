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
        13: "3.25rem", // 52px — form input height (h-13)
      },
      fontSize: {
        h1: ["2rem", { lineHeight: "1.2", fontWeight: "700" }],       // 32px
        h2: ["1.5rem", { lineHeight: "1.25", fontWeight: "700" }],    // 24px
        h3: ["1.1875rem", { lineHeight: "1.3", fontWeight: "500" }],  // 19px
        "body-lg": ["1.125rem", { lineHeight: "1.55" }],              // 18px - K-5 Base UI Floor
        "body-md": ["1.125rem", { lineHeight: "1.5" }],               // 18px - Scaled for K-5 legibility
        "body-emphasis": ["1.125rem", { lineHeight: "1.5", fontWeight: "600" }],
        caption: ["0.9375rem", { lineHeight: "1.4", fontWeight: "500" }], // 15px
        label: ["0.9375rem", { lineHeight: "1.3", fontWeight: "600" }],
        "data-lg": ["1.75rem", { lineHeight: "1.1", fontWeight: "700" }],
        "data-md": ["1.25rem", { lineHeight: "1.1", fontWeight: "700" }],
        mission: ["1.375rem", { lineHeight: "1.2", fontWeight: "600" }],
      },
      colors: {
        // ── Canvas & Core Surfaces ──────────────────────────────
        canvas: "var(--canvas)",    // Dynamic root canvas mapping
        surface: {
          DEFAULT: "var(--surface)", // Cards, modals, inputs
          sunken: "#EAE6DC",        // Embedded quiz boxes, track rails, input wells
        },
        hairline: "#DCD6C8",        // Default 1px borders
        "hairline-strong": "#B8B0A0",// Dividers & active borders

        // ── Typography & Ink ────────────────────────────────────
        ink: {
          DEFAULT: "var(--ink)",    // Primary dark text (#1A241E / #0F172A)
          soft: "#3A463E",          // Secondary text
          muted: "#8C948D",         // Metadata, placeholders & disabled text
        },
        "text-secondary": "#5C665E", // Direct metadata & caption fallback
        "text-muted": "#8C948D",    // Placeholder & disabled fallback
        "on-ink": "#FFFFFF",        // Text on dark backgrounds

        // ── Chrome / Navigation (UMCLSI Theme) ─────────────────
        sidebar: {
          DEFAULT: "#8F1349",       // Deep UMCLSI Raspberry Pink
          hover: "#7A1040",         // Sidebar hover state
          active: "#A3124C",        // Active highlight
          slate: "#1E293B",         // Soft slate theme option
        },

        // ── Action & Brand Colors (Forest Green CTAs) ───────────
        brand: {
          DEFAULT: "#15803D",       // Main CTA Forest Green Button
          hover: "#166534",         // Button hover
          border: "#14532D",        // Dark bottom edge for 3D buttons
          soft: "#DCFCE7",          // Success & badge backgrounds
        },

        // ── Mission Mode Palette (No Blue) ──────────────────────
        gamified: {
          green: "#58CC02",         // Primary Mission Green CTA
          "green-dark": "#46A302",   // 3D bottom edge for green button
          purple: "#8854C0",        // Streak / bonus highlight
          "purple-dark": "#6C3FB8",  // 3D bottom edge for purple button
          pink: "#8F1349",          // Swapped out blue selection ring for UMCLSI Pink
          "pink-dark": "#6B0D37",    // 3D bottom edge for pink button
          yellow: "#FFC800",        // XP, stars, streak badges
          "yellow-dark": "#E5B200",  // 3D bottom edge for yellow badge
        },

        // ── Feedback & System Alerts (No Blue) ───────────────────
        success: {
          DEFAULT: "#15803D",
          soft: "#DCFCE7",
        },
        error: {
          DEFAULT: "#EA2B2B",
          soft: "#FFDFE0",
          border: "#B91C1C",
        },
        warning: {
          DEFAULT: "#E8963C",
          soft: "#FBEBD6",
        },
        info: {
          DEFAULT: "#8F1349",       // Swapped out blue alert for UMCLSI Pink
          soft: "#FDF2F8",          // Soft light pink card background
        },
      },
      fontFamily: {
        heading: ["var(--font-fredoka)", "Fredoka", "Roboto", "sans-serif"],
        sans: ["var(--font-nunito)", "Nunito", "Roboto", "sans-serif"],
        document: ["var(--font-roboto)", "Roboto", "sans-serif"],
      },
      borderRadius: {
        md: "12px",
        "2xl": "16px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(26, 36, 30, 0.05)",
        "card-hover": "0 4px 16px rgba(26, 36, 30, 0.10)",
        modal: "0 24px 48px rgba(26, 36, 30, 0.18)",
        // ── Tactile Claymorphism Shadows ──────────────────────
        "clay-card": "0 10px 25px -5px rgba(26, 36, 30, 0.06), inset 0 2px 4px 0 rgba(255, 255, 255, 0.8)",
        "clay-button": "0 4px 0 0 #14532D, 0 6px 12px rgba(0, 0, 0, 0.08)",
        "clay-inset": "inset 0 3px 6px 0 rgba(26, 36, 30, 0.08)",
      },
      minHeight: {
        "touch-primary": "56px",
        "touch-secondary": "48px",
        touch: "56px",
      },
      minWidth: {
        touch: "56px",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(-6deg)" },
          "30%": { transform: "rotate(6deg)" },
          "45%": { transform: "rotate(-4deg)" },
          "60%": { transform: "rotate(4deg)" },
          "75%": { transform: "rotate(-2deg)" },
          "90%": { transform: "rotate(2deg)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "60%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.08)" },
          "70%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "drawer-up": "slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        wiggle: "wiggle 0.6s ease-in-out",
        "pop-in": "pop-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;