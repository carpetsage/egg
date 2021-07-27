module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
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
