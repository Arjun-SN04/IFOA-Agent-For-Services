/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ── Primary: Blue ──────────────────────────────────────
        primary: {
          DEFAULT:  '#1d4ed8', // blue-700
          dark:     '#1e40af', // blue-800
          light:    '#3b82f6', // blue-500
          xlight:   '#dbeafe', // blue-100
          muted:    '#eff6ff', // blue-50
        },
        // ── Secondary: Red ─────────────────────────────────────
        secondary: {
          DEFAULT:  '#dc2626', // red-600
          dark:     '#b91c1c', // red-700
          light:    '#ef4444', // red-500
          xlight:   '#fecaca', // red-200
          muted:    '#fef2f2', // red-50
        },
        // ── Accent: Black ──────────────────────────────────────
        accent: {
          DEFAULT:  '#0f172a',
          soft:     '#1e293b',
          card:     '#1e293b',
        },
        // ── Light page surfaces ────────────────────────────────
        surface: {
          DEFAULT:  '#ffffff',
          soft:     '#f8fafc',
          muted:    '#f1f5f9',
        },
        // ── Text ──────────────────────────────────────────────
        text: {
          main:   '#0f172a',
          muted:  '#475569',
          light:  '#94a3b8',
        },
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
        'red-gradient':    'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
        'dark-gradient':   'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      },
      boxShadow: {
        'blue-glow':  '0 0 0 4px rgba(29,78,216,0.15)',
        'red-glow':   '0 0 0 4px rgba(220,38,38,0.12)',
      },
    },
  },
  plugins: [],
}
