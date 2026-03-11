import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "biosense-bg": "#020614",
        "biosense-surface": "#050b1f",
        "biosense-surface-soft": "#090f24",
        "biosense-accent": "#4ef2c5",
        "biosense-accent-soft": "#1b463a",
        "biosense-blue": "#2bb1ff",
        "biosense-amber": "#ffb347",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "SF Pro Text",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

