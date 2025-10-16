/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'bounce-soft': 'bounce 1s ease-in-out',
        'float-right': 'floatRight 20s linear infinite',
        'float-right-slow': 'floatRightSlow 160s linear infinite',
        'fly-right': 'flyRight 20s linear infinite',
        'fly-right-slow': 'flyRightSlow 80s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        floatRight: {
          '0%': { transform: 'translateX(-100px)' },
          '100%': { transform: 'translateX(calc(100vw + 100px))' },
        },
        floatRightSlow: {
          '0%': { transform: 'translateX(-100px)' },
          '100%': { transform: 'translateX(calc(100vw + 100px))' },
        },
        flyRight: {
          '0%': { transform: 'translateX(-60px) translateY(0px)' },
          '25%': { transform: 'translateX(25vw) translateY(-10px)' },
          '50%': { transform: 'translateX(50vw) translateY(5px)' },
          '75%': { transform: 'translateX(75vw) translateY(-5px)' },
          '100%': { transform: 'translateX(calc(100vw + 60px)) translateY(0px)' },
        },
        flyRightSlow: {
          '0%': { transform: 'translateX(-60px) translateY(0px)' },
          '25%': { transform: 'translateX(25vw) translateY(-10px)' },
          '50%': { transform: 'translateX(50vw) translateY(5px)' },
          '75%': { transform: 'translateX(75vw) translateY(-5px)' },
          '100%': { transform: 'translateX(calc(100vw + 60px)) translateY(0px)' },
        },
      }
    },
  },
  plugins: [],
}