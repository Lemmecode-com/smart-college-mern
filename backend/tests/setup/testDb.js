'use strict';

/**
 * testDb.js — Hardened Test Database Setup
 *
 * ISOLATION GUARANTEES:
 *   1. Remote and cloud MongoDB URIs are rejected before any network connection
 *      is attempted (scheme check + hostname check + database name check).
 *   2. After connecting, the actual driver-reported host and database are
 *      re-verified before any destructive operation is allowed.
 *   3. clearTestDb() is fail-closed: it will refuse to call deleteMany()
 *      unless every isolation condition is independently confirmed.
 *   4. When MONGO_URI is absent or USE_IN_MEMORY_DB=true, an ephemeral
 *      MongoMemoryServer instance is started automatically.  No network
 *      connection is ever opened in that path.
 *   5. Connection strings (which may contain credentials) are never logged.
 *      Only sanitized metadata (scheme-stripped host, port, dbName) is printed.
 *
 * ALLOWED CONNECTIONS:
 *   Scheme  : mongodb://  only (mongodb+srv:// is always rejected)
 *   Hosts   : 127.0.0.1, localhost, ::1  only
 *   DB name : novaa-test  only
 */

const mongoose = require('mongoose');

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_DB_NAME   = 'novaa-test';
const ALLOWED_HOSTS      = new Set(['127.0.0.1', 'localhost', '::1']);
const FORBIDDEN_PATTERNS = [
  /\.mongodb\.net/i,
  /\.aws\./i,
  /\.azure\./i,
  /\.gcp\./i,
  /atlas/i,
];

// Tracks a MongoMemoryServer instance started by this module (if any).
let _memoryServer = null;

// ─── URI Validation (pure, no network) ───────────────────────────────────────

/**
 * Validate a MongoDB connection URI before opening any network connection.
 * Throws a descriptive Error if the URI is unsafe for test use.
 *
 * @param {string} uri
 */
function validateTestUri(uri) {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error(
      '🛑 testDb BLOCKED (validateTestUri): URI is empty or not a string.',
    );
  }

  // ── 1. Scheme ─────────────────────────────────────────────────────────────
  if (uri.startsWith('mongodb+srv://')) {
    throw new Error(
      '🛑 testDb BLOCKED (validateTestUri): ' +
        "Remote/cloud scheme 'mongodb+srv:' is forbidden in tests. " +
        'Only mongodb://127.0.0.1:PORT/novaa-test is allowed.',
    );
  }
  if (!uri.startsWith('mongodb://')) {
    throw new Error(
      '🛑 testDb BLOCKED (validateTestUri): ' +
        `Unrecognised URI scheme. Only 'mongodb://' is allowed in tests.`,
    );
  }

  // ── 2. Parse ──────────────────────────────────────────────────────────────
  // Manually parse to avoid the Node URL parser normalising mongodb+srv differently.
  // Strip the scheme, split authority from path.
  const withoutScheme = uri.slice('mongodb://'.length);     // "host:port,host2:port/db?opts"
  const slashIdx      = withoutScheme.indexOf('/');

  if (slashIdx === -1) {
    throw new Error(
      '🛑 testDb BLOCKED (validateTestUri): ' +
        'URI is missing the database name path component (/novaa-test).',
    );
  }

  const authorityPart = withoutScheme.slice(0, slashIdx);   // "host:port" or "user:pass@host:port,…"
  const pathAndQuery  = withoutScheme.slice(slashIdx + 1);  // "novaa-test?opts"

  // ── 3. Strip credentials from authority ──────────────────────────────────
  const atIdx     = authorityPart.lastIndexOf('@');
  const hostsPart = atIdx !== -1 ? authorityPart.slice(atIdx + 1) : authorityPart;

  // ── 4. Check every host ───────────────────────────────────────────────────
  const hostEntries = hostsPart.split(',');
  for (const entry of hostEntries) {
    const host = entry.split(':')[0].toLowerCase().trim();

    if (!ALLOWED_HOSTS.has(host)) {
      // Also reject anything matching a known cloud pattern.
      const isForbiddenPattern = FORBIDDEN_PATTERNS.some((re) => re.test(host));
      throw new Error(
        '🛑 testDb BLOCKED (validateTestUri): ' +
          `Host '${host}' is not allowed in tests. ` +
          (isForbiddenPattern
            ? 'This host matches a known cloud/remote provider pattern. '
            : '') +
          `Only localhost, 127.0.0.1, and ::1 are permitted.`,
      );
    }
  }

  // ── 5. Extract and validate database name ─────────────────────────────────
  const dbName = pathAndQuery.split('?')[0].trim();

  if (!dbName) {
    throw new Error(
      '🛑 testDb BLOCKED (validateTestUri): ' +
        `URI is missing the database name. ` +
        `Tests must target '${REQUIRED_DB_NAME}' explicitly.`,
    );
  }

  if (dbName !== REQUIRED_DB_NAME) {
    throw new Error(
      '🛑 testDb BLOCKED (validateTestUri): ' +
        `Target database '${dbName}' is invalid. ` +
        `Tests must strictly target '${REQUIRED_DB_NAME}'.`,
    );
  }
}

/**
 * Return a sanitised summary of the active Mongoose connection for logging.
 * Never includes credentials or the raw URI.
 *
 * @returns {string}
 */
function _safeConnectionSummary() {
  const conn = mongoose.connection;
  const host = conn.host   || '(unknown)';
  const port = conn.port   || '(unknown)';
  const db   = conn.db ? conn.db.databaseName : '(unknown)';
  return `host=${host}:${port}, db=${db}`;
}

// ─── Post-connection driver verification ─────────────────────────────────────

/**
 * Inspect the driver-reported connection state and throw if the active
 * connection does not target an isolated local test instance.
 *
 * Call this after mongoose.connect() returns.
 */
function verifyConnectedInstance() {
  const conn = mongoose.connection;

  if (!conn || conn.readyState !== 1) {
    throw new Error(
      '🛑 testDb BLOCKED (verifyConnectedInstance): ' +
        'Mongoose is not in a connected state (readyState !== 1).',
    );
  }

  const reportedHost = (conn.host || '').toLowerCase().trim();
  const reportedDb   = conn.db ? conn.db.databaseName : '';

  if (!ALLOWED_HOSTS.has(reportedHost)) {
    // Forcibly disconnect before throwing.
    mongoose.disconnect().catch(() => {});
    throw new Error(
      '🛑 testDb BLOCKED (verifyConnectedInstance): ' +
        `Driver-reported host '${reportedHost}' is not a loopback address. ` +
        'Disconnecting immediately to prevent remote data loss.',
    );
  }

  if (reportedDb !== REQUIRED_DB_NAME) {
    mongoose.disconnect().catch(() => {});
    throw new Error(
      '🛑 testDb BLOCKED (verifyConnectedInstance): ' +
        `Driver-reported database name '${reportedDb}' does not equal '${REQUIRED_DB_NAME}'. ` +
        'Disconnecting immediately.',
    );
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Connect to a safe, isolated test MongoDB instance.
 *
 * Resolution order:
 *   1. If USE_IN_MEMORY_DB=true  → start MongoMemoryServer (ephemeral, no network).
 *   2. If MONGO_URI is absent    → start MongoMemoryServer (ephemeral, no network).
 *   3. If MONGO_URI is present   → validate URI strictly, then connect.
 *
 * In all cases the connected instance is verified after connection.
 */
const connectTestDb = async () => {
  const rawUri       = process.env.MONGO_URI;
  const useInMemory  = !rawUri || process.env.USE_IN_MEMORY_DB === 'true';

  if (useInMemory) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    _memoryServer = await MongoMemoryServer.create({
      instance: { dbName: REQUIRED_DB_NAME },
    });
    const memUri = _memoryServer.getUri(REQUIRED_DB_NAME);
    await mongoose.connect(memUri, { dbName: REQUIRED_DB_NAME });
    verifyConnectedInstance();
    console.log(
      `✅ Connected to in-memory test MongoDB [${_safeConnectionSummary()}]`,
    );
  } else {
    // Validate URI before touching the network.
    validateTestUri(rawUri);
    await mongoose.connect(rawUri);
    // Verify that the driver actually landed on a safe instance.
    verifyConnectedInstance();
    console.log(
      `✅ Connected to local test MongoDB [${_safeConnectionSummary()}]`,
    );
  }
};

/**
 * Wipe all collections in the test database.
 *
 * Fail-closed: throws without calling deleteMany() if any isolation
 * condition cannot be independently confirmed.
 */
const clearTestDb = async () => {
  // ── Guard 1: NODE_ENV ─────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      '🛑 clearTestDb BLOCKED: NODE_ENV is "' +
        process.env.NODE_ENV +
        '" (expected "test") — refusing to clear database.',
    );
  }

  // ── Guard 2: Connection state ─────────────────────────────────────────────
  const conn = mongoose.connection;
  if (!conn || conn.readyState !== 1) {
    throw new Error(
      '🛑 clearTestDb BLOCKED: Mongoose is not connected (readyState !== 1).',
    );
  }

  // ── Guard 3: Driver-reported database name ────────────────────────────────
  const reportedDb = conn.db ? conn.db.databaseName : '';
  if (reportedDb !== REQUIRED_DB_NAME) {
    throw new Error(
      '🛑 clearTestDb BLOCKED: driver-reported database is "' +
        reportedDb +
        `" — must be "${REQUIRED_DB_NAME}". Refusing to clear.`,
    );
  }

  // ── Guard 4: Driver-reported host ─────────────────────────────────────────
  const reportedHost = (conn.host || '').toLowerCase().trim();
  if (!ALLOWED_HOSTS.has(reportedHost)) {
    throw new Error(
      '🛑 clearTestDb BLOCKED: driver-reported host "' +
        reportedHost +
        '" is not a loopback address. ' +
        'Refusing to clear — connection is not an isolated local test instance.',
    );
  }

  // ── All guards passed: safe to clear ─────────────────────────────────────
  const collections = conn.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};

/**
 * Disconnect and shut down any in-memory server started by this module.
 */
const closeTestDb = async () => {
  await mongoose.disconnect();
  if (_memoryServer) {
    await _memoryServer.stop();
    _memoryServer = null;
  }
  console.log(`✅ Disconnected from test MongoDB`);
};

// Export the validation helpers for use in isolation unit tests.
module.exports = {
  connectTestDb,
  clearTestDb,
  closeTestDb,
  // Exported for unit-testing the guards in isolation (no network required):
  _validateTestUri: validateTestUri,
  _verifyConnectedInstance: verifyConnectedInstance,
};
