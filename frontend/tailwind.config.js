/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Control Panel Color Palette (Halo Product Design)
        // Main page/element background requested by user: #d6dce0
        cp: {
          white: '#FEFEFE',      // Pure White (Cards, Container Surfaces)
          bg: '#d6dce0',         // Main Background (#d6dce0 Hidden Creek)
          panel: '#E2E7EA',      // Soft Tint Panel
          card: '#FEFEFE',       // White Card Surface
          border: '#B5C1C8',     // Muted Border
          kinder: '#B5C1C8',     // Soft Steel Gray
          shale: '#727A84',      // Deep Shale Text
          navy: '#121E36',       // Deep Dark Slate Text & Accents
          highlight: '#059669',  // Emerald Accent
        }
      }
    },
  },
  plugins: [],
}
