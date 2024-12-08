import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';
import forms from '@tailwindcss/forms';


export default {
  content: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    screens: {
      xs: '411px',
      ...defaultTheme.screens,
    },
    extend: {
      maxWidth: {
        xxxs: '12rem',
        xxs: '16rem',
      },
      colors: {
        green: colors.emerald,
        yellow: colors.amber,
        purple: colors.violet,
      }
    },
  },
  plugins: [forms],
} satisfies Config;
