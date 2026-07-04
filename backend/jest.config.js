require('dotenv').config({ path: '.env.test' });

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testTimeout: 60000,
  maxWorkers: 1,
  transformIgnorePatterns: [
    '[\\\\/]node_modules[\\\\/](?!uuid[\\\\/]).+'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
