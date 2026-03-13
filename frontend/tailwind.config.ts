import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        surface: "var(--surface)",
        border: "var(--border)",
        blue: { DEFAULT: "var(--blue)", 50: "#EFF6FF", 100: "#DBEAFE", 500: "#0EA5E9", 600: "#0284C7" },
        green: { DEFAULT: "var(--green)", 50: "#ECFDF5", 100: "#D1FAE5", 500: "#10B981" },
        amber: { DEFAULT: "var(--amber)", 50: "#FFFBEB", 100: "#FEF3C7", 500: "#F59E0B" },
        red: { DEFAULT: "var(--red)", 50: "#FEF2F2", 100: "#FEE2E2", 500: "#EF4444" },
        text: "var(--text)",
        muted: "var(--muted)",
        "organ-gold": "var(--organ-gold)",
        "organ-pink": "var(--organ-pink)",
        "organ-violet": "var(--organ-violet)",
      },
      fontFamily: {
        serif: ["var(--font-instrument)", "Georgia", "serif"],
        mono: ["var(--font-ibm-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-bebas)", "Impact", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "float": "float 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "ecg": "ecg 3s linear infinite",
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.15)", opacity: "0.8" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(-4px)" },
          "50%": { transform: "translateY(4px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
