/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1220',
        surface: '#131c2e',
        surface2: '#1b273d',
        line: '#26344f',
        accent: '#34d399',
        accentDim: '#10b981',
      },
    },
  },
  plugins: [],
};
