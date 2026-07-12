import PrimeUI from 'tailwindcss-primeui';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: ['selector', '[class~="dark"]'],
  theme: {
    extend: {},
  },
  plugins: [PrimeUI],
};
