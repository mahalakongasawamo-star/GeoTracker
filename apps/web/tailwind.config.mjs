/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9ff",
          100: "#d8f0ff",
          500: "#0b8de8",
          600: "#0b6cba",
          700: "#0a548f",
        },
        score: {
          green: "#16a34a",
          yellow: "#eab308",
          red: "#dc2626",
          gray: "#9ca3af",
        },
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 1px 0 0 rgba(255,255,255,0.6) inset, 0 12px 40px -12px rgba(11,108,186,0.25)",
        "glass-lg": "0 1px 0 0 rgba(255,255,255,0.7) inset, 0 24px 80px -20px rgba(11,108,186,0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "mesh-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "33%": { transform: "translate3d(4%, -3%, 0) scale(1.05)" },
          "66%": { transform: "translate3d(-3%, 4%, 0) scale(0.97)" },
        },
        marquee: {
          "0%": { transform: "translate3d(0, 0, 0)" },
          "100%": { transform: "translate3d(-50%, 0, 0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "mesh-drift": "mesh-drift 24s ease-in-out infinite",
        "mesh-drift-slow": "mesh-drift 36s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        shimmer: "shimmer 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
