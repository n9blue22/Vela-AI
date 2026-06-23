/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--color-bg) / <alpha-value>)",
        panel: "hsl(var(--color-panel) / <alpha-value>)",
        panelAlt: "hsl(var(--color-panel-alt) / <alpha-value>)",
        line: "hsl(var(--color-line) / <alpha-value>)",
        text: "hsl(var(--color-text) / <alpha-value>)",
        subtext: "hsl(var(--color-subtext) / <alpha-value>)",
        primary: "hsl(var(--color-primary) / <alpha-value>)",
        primaryStrong: "hsl(var(--color-primary-strong) / <alpha-value>)",
        success: "hsl(var(--color-success) / <alpha-value>)",
        danger: "hsl(var(--color-danger) / <alpha-value>)",
        warning: "hsl(var(--color-warning) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 22px 50px -30px rgba(20, 8, 18, 0.42), 0 10px 24px -18px rgba(216, 108, 146, 0.16)"
      },
      borderRadius: {
        card: "8px"
      }
    }
  },
  plugins: []
};
