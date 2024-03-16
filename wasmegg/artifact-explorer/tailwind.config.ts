import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

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
    },
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;
