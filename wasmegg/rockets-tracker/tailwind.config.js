module.exports = {
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      colors: {
        gray: {
          150: '#eceef1',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
