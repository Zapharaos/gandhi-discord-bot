import PrimeUI from 'tailwindcss-primeui';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: ['selector', '[class~="dark"]'],
  theme: {
    extend: {
      // Accent hues layered on top of the PrimeNG blurple `primary` ramp,
      // used sparingly for gradients and glows on the marketing surfaces.
      colors: {
        neon: {
          cyan: '#22d3ee',
          pink: '#f472b6',
          green: '#57f287', // Discord green
        },
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(1rem)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(88 101 242 / 0.45)' },
          '50%': { boxShadow: '0 0 32px 4px rgb(88 101 242 / 0.35)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s ease-out both',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, rgb(88 101 242 / 0.15) 1px, transparent 1px)',
      },
    },
  },
  plugins: [PrimeUI],
};
