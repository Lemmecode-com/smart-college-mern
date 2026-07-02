require('dotenv').config({ path: '.env.test' });

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testTimeout: 10000,
  transformIgnorePatterns: [
    '[\\\\/]node_modules[\\\\/](?!uuid[\\\\/]).+'
  ],
};
