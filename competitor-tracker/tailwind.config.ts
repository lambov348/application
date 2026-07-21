import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1220",
        panel: "#111a2e",
        edge: "#1f2b45",
        accent: "#4f8cff",
      },
    },
  },
  plugins: [],
};

export default config;
