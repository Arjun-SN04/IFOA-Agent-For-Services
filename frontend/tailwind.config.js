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
        navy: {
          900: '#0a1628',
          800: '#0d1e3a',
          700: '#162444',
          600: '#1e3a5f',
        }
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%)',
      }
    },
  },
  plugins: [],
}
