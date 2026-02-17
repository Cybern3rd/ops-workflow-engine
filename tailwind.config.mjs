/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neo: '#FF6B6B',
        marcus: '#4ECDC4',
        sofia: '#45B7D1',
        kenji: '#96CEB4',
        aisha: '#FFEAA7',
        'dr-elena': '#DFE6E9',
        priya: '#74B9FF',
        jackson: '#FD79A8',
        maya: '#A29BFE',
        david: '#FD9644',
        zara: '#FD79A8',
        sarah: '#636E72',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
