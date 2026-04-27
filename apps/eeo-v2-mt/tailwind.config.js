/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: '#3b82f6',
          dark: '#1e3a5f',
        },
        background: {
          DEFAULT: '#ffffff',
          dark: '#0f172a',
        },
        card: {
          DEFAULT: '#f8fafc',
          dark: '#1e293b',
        },
        'card-dark-blue': '#2d3f5c',
        'status-completed': '#10b981',
        'status-in-progress': '#f59e0b',
        'status-pending': '#ef4444',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
