/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F1115",
        bgsoft: "#15181E",
        bgcard: "#1A1E26",
        line: "#272C36",
        ink: "#ECEEF2",
        inkdim: "#9BA1AE",
        inkfaint: "#5C6270",
        income: "#6366F1",
        expense: "#F2545B",
        good: "#34D399",
        warn: "#FBBF24",
      },
      fontFamily: {
        display: ["Space Grotesk", "Arial", "sans-serif"],
        body: ["Inter", "Arial", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        xl2: "14px",
      },
    },
  },
  plugins: [],
};
