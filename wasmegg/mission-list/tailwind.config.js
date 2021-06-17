module.exports = {
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      divideWidth: {
        3: '3px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
