module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}'],
  plugins: [require('@tailwindcss/forms')],
};
