require('dotenv').config(); // Load .env first (contains GLITCHTIP config)
require('dotenv').config({ path: '.env.test', override: true }); // Load .env.test for test-specific overrides

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testTimeout: 60000,
  forceExit: true,
  maxWorkers: 1,
  transformIgnorePatterns: [
    '[\\\\/]node_modules[\\\\/](?!uuid[\\\\/]).+'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
