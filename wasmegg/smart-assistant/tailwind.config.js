module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      gridTemplateColumns: {
        'max-2': 'repeat(2, max-content)',
        'max-4': 'repeat(4, max-content)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
