import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "border-soft": "hsl(var(--border-soft))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--border-strong))",
        ring: "hsl(var(--text-2))",
        background: "hsl(var(--bg))",
        "background-soft": "hsl(var(--bg-soft))",
        foreground: "hsl(var(--text-1))",
        muted: {
          DEFAULT: "hsl(var(--bg-soft))",
          foreground: "hsl(var(--text-2))",
        },
        text: {
          1: "hsl(var(--text-1))",
          2: "hsl(var(--text-2))",
          3: "hsl(var(--text-3))",
        },
        paper: "hsl(var(--paper))",
        teal: {
          bg: "hsl(var(--teal-bg))",
          bd: "hsl(var(--teal-bd))",
          ink: "hsl(var(--teal-ink))",
        },
        amber: {
          bg: "hsl(var(--amber-bg))",
          bd: "hsl(var(--amber-bd))",
          ink: "hsl(var(--amber-ink))",
        },
        purple: {
          bg: "hsl(var(--purple-bg))",
          bd: "hsl(var(--purple-bd))",
          ink: "hsl(var(--purple-ink))",
        },
        blue: {
          bg: "hsl(var(--blue-bg))",
          bd: "hsl(var(--blue-bd))",
          ink: "hsl(var(--blue-ink))",
        },
        rose: {
          bg: "hsl(var(--rose-bg))",
          bd: "hsl(var(--rose-bd))",
          ink: "hsl(var(--rose-ink))",
        },
        // авторские цвета
        author: {
          anya: "hsl(var(--author-anya))",
          igor: "hsl(var(--author-igor))",
          viktor: "hsl(var(--author-viktor))",
          marina: "hsl(var(--author-marina))",
          dima: "hsl(var(--author-dima))",
          mikh: "hsl(var(--author-mikh))",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(40, 30, 10, 0.04), 0 4px 16px rgba(40, 30, 10, 0.05)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
        "pulse-text": {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "0.4" },
        },
        blink: { "50%": { opacity: "0" } },
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "pulse-text": "pulse-text 1.5s ease-in-out infinite",
        blink: "blink 1s infinite",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PT Sans",
          "system-ui",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
