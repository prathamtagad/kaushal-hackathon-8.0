/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#FFF4E0',
          ink: '#000000',
          yellow: '#FFD60A',
          pink: '#FF4D8D',
          blue: '#3A86FF',
          mint: '#06D6A0',
          orange: '#FF7B00',
          lilac: '#B388FF',
          red: '#FF3B30',
          white: '#FFFFFF',
          cream: '#FFF4E0',
          surface: '#FFFDF9',
        }
      },
      fontFamily: {
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      boxShadow: {
        'neo-xs': '2px 2px 0 #000000',
        'neo-sm': '3px 3px 0 #000000',
        'neo': '4px 4px 0 #000000',
        'neo-md': '5px 5px 0 #000000',
        'neo-lg': '6px 6px 0 #000000',
        'neo-xl': '8px 8px 0 #000000',
        'neo-active': '2px 2px 0 #000000',
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}
