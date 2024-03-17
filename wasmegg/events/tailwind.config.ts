import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';
import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      screens: {
        '2col': '1512px',
        '3col': '2280px',
      },
      width: {
        6.5: '1.625rem',
      },
      maxWidth: {
        '2.5xl': '45rem',
      },
      colors: {
        green: colors.emerald,
        yellow: colors.amber,
        purple: colors.violet,
      },
    },
  },
  plugins: [forms],
} satisfies Config;
