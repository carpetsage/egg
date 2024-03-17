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
      gridTemplateColumns: {
        'max-2': 'repeat(2, max-content)',
        'max-3': 'repeat(3, max-content)',
        'max-4': 'repeat(4, max-content)',
      },
    },
  },
  plugins: [forms],
} satisfies Config;
