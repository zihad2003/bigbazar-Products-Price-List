/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#B91C1C', // Red from BAZAR
          dark: '#991B1B',
        },
        neutral: {
          900: '#171717', // Dark gray
          950: '#0a0a0a',
          800: '#262626',
        }
      },
    },
  },
  plugins: [],
}