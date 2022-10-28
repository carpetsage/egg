const colors = require('tailwindcss/colors');
const plugin = require('tailwindcss/plugin');

module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{vue,ts}', '../ui/**/*.vue'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        ultrawide: '1728px',
      },
      colors: {
        green: {
          ...colors.emerald,
          350: '#51dda8', // A blend of emerald-300 #6ee7b7 and emerald-400 #34d399
        },
        gray: {
          ...colors.gray,
          750: '#333338',
        },
        purple: {
          ...colors.purple,
        },
        'cool-gray': colors.coolGray,
        // Interpolation of gray-700 (#3F3F46) and red-500 (#EF4444).
        'gray-700-red-tint': {
          100: '#503f45',
          200: '#624045',
          300: '#734045',
          400: '#854145',
          500: '#974145',
          600: '#a84244',
          700: '#ba4244',
          800: '#cb4344',
          900: '#dd4344',
        },
        // Interpolation of gray-700 (#3F3F46) and green-500 (#10B981).
        'gray-700-green-tint': {
          100: '#3a4b4b',
          200: '#355751',
          300: '#306357',
          400: '#2c6f5d',
          500: '#277c63',
          600: '#228869',
          700: '#1e946f',
          800: '#19a075',
          900: '#14ac7b',
        },
        // Interpolation of gray-700 (#3F3F46) and blue-500 (#3B82F6).
        'gray-700-blue-tint': {
          100: '#3e4557',
          200: '#3e4c69',
          300: '#3d537a',
          400: '#3d598c',
          500: '#3d609e',
          600: '#3c67af',
          700: '#3c6dc1',
          800: '#3b74d2',
          900: '#3b7be4',
        },
        // Interpolation of gray-700 (#3F3F46) and yellow-500 (#F59E0B).
        'gray-700-yellow-tint': {
          100: '#514840',
          200: '#63523a',
          300: '#755b34',
          400: '#87652e',
          500: '#9a6e28',
          600: '#ac7822',
          700: '#be811c',
          800: '#d08b16',
          900: '#e29410',
        },
      },
      transitionDuration: {
        0: '0ms',
      },
      maxWidth: {
        xxs: '16rem',
        ultrawide: '108rem',
      },
      height: {
        4.5: '1.125rem',
      },
      width: {
        4.5: '1.125rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    // Use !class to apply class as important!
    plugin(({ addVariant }) => {
      addVariant('important', ({ container }) => {
        container.walkRules(rule => {
          rule.selector = `.\\!${rule.selector.slice(1)}`;
          rule.walkDecls(decl => {
            decl.important = true;
          });
        });
      });
    }),
  ],
};
