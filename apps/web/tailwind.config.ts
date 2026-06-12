import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121417',
        canvas: '#f5f0e8',
        ember: '#e85d3f',
        moss: '#5d7f59',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Nunito Sans', 'ui-sans-serif', 'sans-serif'],
        game: ['Anton', 'Impact', 'Arial Black', 'sans-serif'],
        mikhak: ['Mikhak', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
