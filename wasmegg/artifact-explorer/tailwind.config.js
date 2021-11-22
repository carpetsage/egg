module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../../ui/**/*.vue'],
  theme: {
    extend: {
      screens: {
        xs: '411px',
      },
      maxWidth: {
        xxxs: '12rem',
        xxs: '16rem',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
