const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    fontFamily: {
      sans: ['IBM Plex Sans', ...defaultTheme.fontFamily.sans],
    },
    fontSize: {
      xs: ['10px', '16px'],
      sm: ['12px', '20px'],
      base: ['15px', '24px'],
      h3: ['16px', '25px'],
      h2: ['17px', '26px'],
      h1: ['19px', '28px'],
    },
    extend: {
      colors: {
        purple: colors.purple,
        fuchsia: colors.fuchsia,
      },
      gridTemplateColumns: {
        'max-1': 'max-content',
        'max-2': 'repeat(2, max-content)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
