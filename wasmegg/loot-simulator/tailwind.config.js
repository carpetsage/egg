module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  plugins: [require('@tailwindcss/forms')],
};
