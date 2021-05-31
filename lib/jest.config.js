module.exports = {
  preset: 'ts-jest/presets/default-esm',
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  // proto/index.js cannot be transformed by ts-jest, so we introduce babel-jest.
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};
