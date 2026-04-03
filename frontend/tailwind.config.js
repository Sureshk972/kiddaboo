/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream:      { DEFAULT: '#FAF7F2', dark: '#F0EBE3' },
        sage:       { light: '#DAE4D0', DEFAULT: '#A3B18A', dark: '#7A8F6D' },
        taupe:      { DEFAULT: '#8B7E74', dark: '#6B5E54' },
        terracotta: { light: '#E8C4B0', DEFAULT: '#C08B6E' },
        charcoal:   '#2F2F2F',
      },
      fontFamily: {
        heading: ['"Fraunces"', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
