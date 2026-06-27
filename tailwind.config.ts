import type { Config } from "tailwindcss";

// Design tokens for Netra AI.
// Palette deliberately echoes the safe/warning/alert states used by the
// monitoring mascot, so the same color language runs through quizzes,
// dashboards, and the health monitor itself.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF7F0",
        ink: "#2C2C2A",
        teal: {
          50: "#E1F5EE",
          100: "#9FE1CB",
          200: "#5DCAA5",
          400: "#1D9E75",
          600: "#0F6E56",
          800: "#085041",
          900: "#04342C",
        },
        coral: {
          50: "#FAECE7",
          100: "#F5C4B3",
          200: "#F0997B",
          400: "#D85A30",
          600: "#993C1D",
          800: "#712B13",
          900: "#4A1B0C",
        },
        amber: {
          50: "#FAEEDA",
          200: "#FAC775",
          400: "#EF9F27",
          600: "#854F0B",
          800: "#633806",
        },
        alertred: {
          50: "#FCEBEB",
          200: "#F7C1C1",
          400: "#E24B4A",
          600: "#A32D2D",
          800: "#791F1F",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
