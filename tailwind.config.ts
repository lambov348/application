import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Фирменный зелёный в духе TaskRabbit.
        brand: {
          DEFAULT: "#0f8a3c",
          dark: "#0b6e2f",
          light: "#e7f6ec",
        },
      },
    },
  },
  plugins: [],
};

export default config;
