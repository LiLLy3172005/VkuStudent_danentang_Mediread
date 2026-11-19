import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-be-vietnam-pro)', '"Be Vietnam Pro"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: "#0B6B73", // Deep Medical Teal
          dark: "#073F46",    // Dark Navy Teal
          light: "#DDEEEB",   // Soft Mint Container
        },
        mint: {
          soft: "#F2F8F7",
        },
        background: "#F8FAFA",
        surface: "#FFFFFF",
        cream: {
          DEFAULT: "#F6EFE6",
        },
        slateText: {
          DEFAULT: "#14283A", // Dark slate navy
          secondary: "#5B6B77", // Muted slate gray
          muted: "#8A8A8A",
        },
        warning: {
          DEFAULT: "#C2410C",
          light: "#FDF1DC",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2",
        },
        success: {
          DEFAULT: "#15803D",
          light: "#DCFCE7",
        },
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 4px 20px -2px rgba(7, 63, 70, 0.08)",
        button: "0 4px 14px rgba(11, 107, 115, 0.25)",
      },
      fontSize: {
        elderCaption: "14px",
        elderBody: "18px",
        elderBodyLarge: "20px",
        elderSubtitle: "22px",
        elderTitle: "26px",
        elderHero: "34px",
      },
    },
  },
  plugins: [],
};

export default config;
