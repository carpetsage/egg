import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';
import forms from '@tailwindcss/forms';

export default {
  content: ["./index.html", "./src/**/*.{vue,ts}", "../../ui/**/*.vue"],
  plugins: [forms],
  theme: {
    extend: {
      maxWidth: {
        xxs: "16rem",
        ultrawide: "108rem",
      },
      colors: {
        green: colors.emerald,
        yellow: colors.amber,
        purple: colors.violet,
      },
    },
  },
} satisfies Config;
