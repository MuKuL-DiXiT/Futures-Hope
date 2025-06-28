/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  
  ],
  theme: {
    extend: {
      fontFamily: {
        marker: ['"Permanent Marker"', 'cursive'], 
      },
      screens: {
        md845: "870px", 
        md955: "955px"
      },
      colors: {
        'forest-deep': '#f8eedc', 
      },

    },
  },
  plugins: [],
}
