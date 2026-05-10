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
    },
  },
  plugins: [],
};
export default config;
