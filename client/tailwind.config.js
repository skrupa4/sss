/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sss-black': '#0d0d0d',
        'sss-card': '#1a1a1a',
        'sss-blue': '#0070ff',
      },
    },
  },
  plugins: [],
}