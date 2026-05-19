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
    },
  },
  plugins: [],
};
