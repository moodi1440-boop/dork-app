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
        navy:        "rgb(var(--adm-bg)  / <alpha-value>)",
        card:        "rgb(var(--adm-card) / <alpha-value>)",
        "card-hover":"rgb(var(--adm-card-hover) / <alpha-value>)",
        border:      "rgb(var(--adm-border) / <alpha-value>)",
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
