const colors = require('tailwindcss/colors');

module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      colors: {
        ...colors,
        gray: colors.coolGray,
      },
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
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
