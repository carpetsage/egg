import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';
import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      colors: {
        gray: {
          ...colors.gray,
          150: '#eceef1',
        },
        fuchsia: colors.fuchsia,
        green: colors.emerald,
        yellow: colors.amber,
        purple: colors.violet,
      },
      width: {
        'onedig': '0.75rem',
        'twodig': '0.9rem',
        'threedig': '1.2rem',
        'fourdig': '1.5rem',
        'fivedig': '1.75rem',
        'sixdig': '2rem',
        'sevendig': '2.25rem',
      },
      gridTemplateColumns: {
        'max-2': 'repeat(2, max-content)',
        'max-3': 'repeat(3, max-content)',
        'max-4': 'repeat(4, max-content)',
      },
    },
  },
  plugins: [forms],
} satisfies Config;
