/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    borderRadius: {
      none: '0',
      sm: '0.375rem',
      DEFAULT: '0.5rem',
      md: '0.625rem',
      lg: '0.75rem',
      xl: '1rem',
      '2xl': '1.25rem',
      '3xl': '1.5rem',
      full: '9999px',
    },
    extend: {
      colors: {
        cream:      { DEFAULT: '#FAF7F1', dark: '#EFEAE0' },
        sage:       { light: '#F0DFD3', DEFAULT: '#C2673C', dark: '#A6532E' },
        taupe:      { DEFAULT: '#6B635A', dark: '#4A443C' },
        terracotta: { light: '#E8C4B0', DEFAULT: '#B07A5B' },
        gold:       { light: '#F5E2B6', DEFAULT: '#D9A441', dark: '#A87E2D' },
        teal:       { light: '#B8DCD8', DEFAULT: '#5BA8A0', dark: '#3F8278' },
        charcoal:   '#1C1814',
      },
      fontFamily: {
        display: ['ui-serif', 'Georgia', 'serif'],
        heading: ['"Inter"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
