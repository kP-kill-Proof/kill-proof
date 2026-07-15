/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0C1013',
        panel: '#12181C',
        teal: { deep: '#1E4B5E', DEFAULT: '#2E7A96', light: '#4FB3D4' },
        silver: '#AEB6BA',
        cream: '#F1EEDA',
        danger: '#C0392B',
      },
      fontFamily: {
        display: ['"Permanent Marker"', 'cursive'],
        body: ['Quicksand', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
