import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#d4a017",
          light: "#f0c040",
          dark: "#a07810",
        },
        navy: "#0d0d1a",
        card: "#111825",
        "card-hover": "#151e2e",
        border: "#1e2535",
      },
      fontFamily: {
        cairo: ["var(--font-cairo)", "sans-serif"],
      },
      keyframes: {
        "slide-in": { from: { opacity: "0", transform: "translateY(-10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "slide-in": "slide-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
