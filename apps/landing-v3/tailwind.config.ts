import type { Config } from "tailwindcss";

// Tokens mirror GEOTRACKER_DESIGN_REVISION.md §2 1:1. Every value here is
// also exposed as a CSS custom property in app/tokens.css so components can
// reference either form (Tailwind class for layout, CSS var for runtime
// effects like the cursor-spotlight gradient).

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        // Ink
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        // Brand
        coral: "var(--coral)",
        "coral-soft": "var(--coral-soft)",
        "coral-deep": "var(--coral-deep)",
        // Semantic
        green: "var(--green)",
        amber: "var(--amber)",
        red: "var(--red)",
        // Dark surfaces (results page tokens — included now so M3 doesn't
        // have to be revisited when M5 lands)
        dark: "var(--dark)",
        "dark-2": "var(--dark-2)",
        "dark-3": "var(--dark-3)",
        "dark-line": "var(--dark-line)",
        "dark-text": "var(--dark-text)",
        "dark-text-2": "var(--dark-text-2)",
        "dark-text-3": "var(--dark-text-3)",
        // LLM accent palette
        acid: "var(--acid)",
        cyan: "var(--cyan)",
        violet: "var(--violet)",
        miss: "var(--miss)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        card: "var(--shadow-lg)",
        "card-dark": "var(--shadow-dark)",
      },
      keyframes: {
        "idle-bob-1": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(2px, -4px)" },
          "50%": { transform: "translate(-1px, 3px)" },
          "75%": { transform: "translate(-3px, -2px)" },
        },
        "idle-bob-2": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "30%": { transform: "translate(-3px, 2px)" },
          "60%": { transform: "translate(2px, -3px)" },
        },
        "idle-bob-3": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "40%": { transform: "translate(3px, 4px)" },
          "70%": { transform: "translate(-2px, -3px)" },
        },
        "idle-rotate": {
          "0%, 100%": { transform: "rotate(45deg) translate(0, 0)" },
          "50%": { transform: "rotate(45deg) translate(0, -2px)" },
        },
        "eyebrow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 12px var(--coral), 0 0 0 0 rgba(255, 91, 62, 0.6)",
          },
          "50%": {
            boxShadow: "0 0 12px var(--coral), 0 0 0 12px rgba(255, 91, 62, 0)",
          },
        },
      },
      animation: {
        "idle-bob-1": "idle-bob-1 18s ease-in-out infinite",
        "idle-bob-2": "idle-bob-2 22s ease-in-out infinite",
        "idle-bob-3": "idle-bob-3 25s ease-in-out infinite",
        "idle-bob-1-rev": "idle-bob-1 20s ease-in-out infinite reverse",
        "idle-bob-2-slow": "idle-bob-2 24s ease-in-out infinite",
        "idle-rotate": "idle-rotate 15s ease-in-out infinite",
        "eyebrow-pulse": "eyebrow-pulse 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
