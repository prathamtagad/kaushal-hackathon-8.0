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
        campus: {
          bg: '#0B0F19',
          card: '#111827',
          cardBorder: '#1F2937',
          cardHover: '#1A2234',
          accent: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
          purple: '#8B5CF6'
        }
      }
    },
  },
  plugins: [],
}
