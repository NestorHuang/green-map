/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'green-primary': '#22863A',
        'green-light': '#F6F8FA',
      },
    },
  },
  plugins: [],
}
