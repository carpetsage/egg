import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';
import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      colors: {
        cyan: colors.cyan,
        lime: colors.lime,
        teal: colors.teal,
        green: colors.emerald,
        yellow: colors.amber,
        purple: colors.violet,
      },
      screens: {
        '3xl': '1600px',
      },
      maxWidth: {
        '10xl': '104rem',
      },
    },
  },
  plugins: [forms],
} satisfies Config;
