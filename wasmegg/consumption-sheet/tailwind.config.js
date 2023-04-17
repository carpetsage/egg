const colors = require('tailwindcss/colors');

module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      colors: {
        cyan: colors.cyan,
        lime: colors.lime,
        teal: colors.teal,
      },
      screens: {
        '3xl': '1600px',
      },
      maxWidth: {
        '10xl': '104rem',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
