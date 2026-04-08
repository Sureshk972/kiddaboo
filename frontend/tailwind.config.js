/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream:      { DEFAULT: '#FAF7F2', dark: '#E6E1D8' },
        sage:       { light: '#DAE4D0', DEFAULT: '#5C6B52', dark: '#3D4A33' },
        taupe:      { DEFAULT: '#6B5E54', dark: '#4A3F37' },
        terracotta: { light: '#E8C4B0', DEFAULT: '#B07A5B' },
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
