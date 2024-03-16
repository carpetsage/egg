import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      colors: {
        ticket: '#7c00c4',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;
