module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // SVGs become React components via @svgr/webpack, so they are mapped rather than
  // stubbed — the stub returns a filename string, which React cannot render as an element.
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svg.tsx',
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
  },
};
