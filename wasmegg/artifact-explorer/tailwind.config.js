const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
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
};
