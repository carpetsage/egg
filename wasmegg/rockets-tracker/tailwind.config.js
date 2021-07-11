const colors = require('tailwindcss/colors');

module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      colors: {
        gray: {
          150: '#eceef1',
        },
        fuchsia: colors.fuchsia,
      },
      gridTemplateColumns: {
        'max-2': 'repeat(2, max-content)',
        'max-3': 'repeat(3, max-content)',
        'max-4': 'repeat(4, max-content)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
