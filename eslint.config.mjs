import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';

export default typescriptEslint.config(
  {
    ignores: [
        "lib/proto/index.js",
        "lib/proto/index.d.ts",
        "lib/sandbox/schema.d.ts",
        "lib/sandbox/schema.js",
        "**/postcss.config.js",
        "**/tailwind.config.js",
        "**/dist"
    ],
  },
  {
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommended,
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        parser: typescriptEslint.parser,
      },
    },
    rules: {
        "no-constant-condition": ["error", {
            checkLoops: false,
        }],

        "no-undef": "off",
        "@typescript-eslint/no-non-null-assertion": "off",

        "@typescript-eslint/no-unused-vars": ["warn", {
            argsIgnorePattern: "^_",
        }],

        "vue/html-closing-bracket-newline": "off",
        "vue/html-indent": "off",

        "vue/html-self-closing": ["error", {
            html: {
                normal: "never",
                void: "always",
            },
        }],

        "vue/max-attributes-per-line": "off",
        "vue/multiline-html-element-content-newline": "off",
        "vue/singleline-html-element-content-newline": "off",
    },
  },
  eslintConfigPrettier
);
