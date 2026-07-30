import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0B0E",
        surface: {
          DEFAULT: "#15151A",
          raised: "#1C1C22",
        },
        ink: {
          DEFAULT: "#F3F1EC",
          muted: "rgba(243,241,236,0.56)",
          faint: "rgba(243,241,236,0.32)",
        },
        line: {
          DEFAULT: "rgba(243,241,236,0.09)",
          strong: "rgba(243,241,236,0.16)",
        },
        brand: {
          red: "#E1261C",
          gold: "#F0B429",
          green: "#2FBE72",
          // legacy alias kept so nothing else needs to change
          yellow: "#F0B429",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-fraunces)", "serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      letterSpacing: {
        widest2: "0.18em",
      },
    },
  },
  plugins: [],
};

export default config;
