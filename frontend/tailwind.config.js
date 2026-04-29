/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    borderRadius: {
      none: '0',
      sm: '0',
      DEFAULT: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '0',
    },
    extend: {
      colors: {
        cream:      { DEFAULT: '#ECE3FB', dark: '#DCC9F5' },
        sage:       { light: '#DCC9F5', DEFAULT: '#8B3FE0', dark: '#6B21D4' },
        taupe:      { DEFAULT: '#8B3FE0', dark: '#6B21D4' },
        terracotta: { light: '#E8C4B0', DEFAULT: '#B07A5B' },
        charcoal:   '#2F2F2F',
      },
      fontFamily: {
        heading: ['"Inter"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
