module.exports = {
  mode: "jit",
  purge: ["./index.html", "./src/**/*.{vue,ts}", "../../ui/**/*.vue"],
  plugins: [require("@tailwindcss/forms")],
  theme: {
    extend: {
      maxWidth: {
        xxs: "16rem",
        ultrawide: "108rem",
      },
    },
  },
};
