import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;
