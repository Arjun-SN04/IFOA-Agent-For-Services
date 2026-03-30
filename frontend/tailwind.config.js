/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          red: '#dc2626',
          'red-dark': '#b91c1c',
          'red-light': '#ef4444',
          'red-xlight': '#fef2f2',
          black: '#0a0a0a',
          'black-soft': '#111111',
          'black-card': '#1a1a1a',
        },
        navy: {
          900: '#0a1628',
          800: '#0d1e3a',
          700: '#162444',
          600: '#1e3a5f',
        }
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        'red-gradient': 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      }
    },
  },
  plugins: [],
}
