import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        milky: "#F9F8F3",
        sand: "#E8DFD0",
        "slate-dark": "#2C2E31",
        accent: "#C45C3E",
      },
    },
  },
  plugins: [],
};
export default config;
