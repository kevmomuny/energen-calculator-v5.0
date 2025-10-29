module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,cjs}',
    'modules/**/*.{js,cjs}',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/test/**'
  ],
  testMatch: [
    '**/test/**/*.test.{js,cjs}',
    '**/test/**/*.spec.{js,cjs}',
    '**/tests/**/*.test.{js,cjs}',
    '**/tests/**/*.spec.{js,cjs}'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/archive/',
    '/backup/'
  ],
  verbose: true,
  testTimeout: 10000,
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  transform: {},
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch)/)'
  ]
};
