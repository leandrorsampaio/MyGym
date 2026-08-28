/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Only apply hover: styles on devices with a real pointer. Without this iOS
  // leaves the hover state stuck on the last element you tapped.
  future: { hoverOnlyWhenSupported: true },
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
