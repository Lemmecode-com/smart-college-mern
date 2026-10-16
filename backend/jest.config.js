/**
 * jest.config.js — Test Runner Configuration
 *
 * SECURITY NOTE:
 *   Only backend/.env.test is loaded here (with override: true).
 *   The root backend/.env is deliberately NOT loaded — it contains
 *   production/staging credentials (MONGO_URI, ENCRYPTION_MASTER_KEY, etc.)
 *   that must never bleed into the test environment.
 *
 *   If backend/.env.test is absent, testDb.js will automatically fall back to
 *   an ephemeral in-memory MongoMemoryServer (no network, no credentials).
 *
 *   NODE_ENV is forced to 'test' here so that all modules that gate
 *   behaviour on NODE_ENV (including clearTestDb) behave correctly.
 */

process.env.NODE_ENV = 'test';

// Load ONLY the test-scoped env file. Never load backend/.env.
require('dotenv').config({ path: '.env.test', override: true });

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