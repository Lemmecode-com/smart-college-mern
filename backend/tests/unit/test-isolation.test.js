'use strict';

/**
 * test-isolation.test.js
 *
 * Unit tests for the fail-closed isolation guards in tests/setup/testDb.js.
 *
 * All tests run entirely in-process with mocked Mongoose state.
 * No network connections are opened; no real credentials are used.
 * Remote or cloud databases are never contacted.
 */

const mongoose = require('mongoose');
const {
  _validateTestUri,
  _verifyConnectedInstance,
  clearTestDb,
  connectTestDb,
  closeTestDb,
} = require('../setup/testDb');

// ─── Helper: capture console.log output ──────────────────────────────────────

const captureLog = () => {
  const lines = [];
  const spy = jest.spyOn(console, 'log').mockImplementation((...args) => {
    lines.push(args.join(' '));
  });
  return { lines, restore: () => spy.mockRestore() };
};

// ─── _validateTestUri ─────────────────────────────────────────────────────────

describe('_validateTestUri — pre-connection URI guard', () => {

  // ISO-01: Atlas SRV scheme rejection
  test('ISO-01: rejects mongodb+srv scheme', () => {
    expect(() =>
      _validateTestUri(
        'mongodb+srv://user:pass@cluster0.qgnwh.mongodb.net/novaa-test',
      ),
    ).toThrow(/remote\/cloud scheme/i);
  });

  // ISO-02: Remote domain rejection
  test('ISO-02: rejects remote domain host', () => {
    expect(() =>
      _validateTestUri('mongodb://user:pass@db.mycollege.edu:27017/novaa-test'),
    ).toThrow(/is not allowed in tests/i);
  });

  // ISO-03: Public IP rejection
  test('ISO-03: rejects public IP address', () => {
    expect(() =>
      _validateTestUri('mongodb://198.51.100.12:27017/novaa-test'),
    ).toThrow(/is not allowed in tests/i);
  });

  // ISO-03b: Atlas-pattern host in standard scheme
  test('ISO-03b: rejects *.mongodb.net host in standard scheme', () => {
    expect(() =>
      _validateTestUri(
        'mongodb://user:pass@cluster0-shard-00-00.qgnwh.mongodb.net:27017/novaa-test',
      ),
    ).toThrow(/is not allowed in tests/i);
  });

  // ISO-03c: Multi-host string where one host is remote
  test('ISO-03c: rejects multi-host URI with any remote host', () => {
    expect(() =>
      _validateTestUri(
        'mongodb://127.0.0.1:27017,198.51.100.12:27018/novaa-test',
      ),
    ).toThrow(/is not allowed in tests/i);
  });

  // ISO-04: Wrong database name
  test('ISO-04: rejects incorrect database name', () => {
    expect(() =>
      _validateTestUri('mongodb://127.0.0.1:27017/smartCollege'),
    ).toThrow(/invalid.*novaa-test|must strictly target/i);
  });

  // ISO-04b: Production-sounding database names
  test('ISO-04b: rejects NOVAA production database name', () => {
    expect(() =>
      _validateTestUri('mongodb://127.0.0.1:27017/NOVAA'),
    ).toThrow(/invalid.*novaa-test|must strictly target/i);
  });

  // ISO-05: Missing database name
  test('ISO-05: rejects URI with empty database name', () => {
    expect(() =>
      _validateTestUri('mongodb://127.0.0.1:27017/'),
    ).toThrow(/missing the database name|target.*novaa-test/i);
  });

  // ISO-05b: URI with no path separator
  test('ISO-05b: rejects URI with no path component at all', () => {
    expect(() =>
      _validateTestUri('mongodb://127.0.0.1:27017'),
    ).toThrow(/missing the database name path/i);
  });

  // ISO-10: Unknown scheme
  test('ISO-10: rejects completely unknown scheme', () => {
    expect(() =>
      _validateTestUri('redis://127.0.0.1:6379/novaa-test'),
    ).toThrow(/unrecognised URI scheme/i);
  });

  // ── Valid cases ─────────────────────────────────────────────────────────────

  test('accepts mongodb://127.0.0.1:27017/novaa-test', () => {
    expect(() =>
      _validateTestUri('mongodb://127.0.0.1:27017/novaa-test'),
    ).not.toThrow();
  });

  test('accepts mongodb://localhost:27017/novaa-test', () => {
    expect(() =>
      _validateTestUri('mongodb://localhost:27017/novaa-test'),
    ).not.toThrow();
  });

  test('accepts URI with query string: mongodb://127.0.0.1:27017/novaa-test?directConnection=true', () => {
    expect(() =>
      _validateTestUri(
        'mongodb://127.0.0.1:27017/novaa-test?directConnection=true',
      ),
    ).not.toThrow();
  });

  test('accepts URI with embedded credentials on loopback', () => {
    // Credentials in the URI are valid for local connections in test.
    expect(() =>
      _validateTestUri('mongodb://testuser:testpass@127.0.0.1:27017/novaa-test'),
    ).not.toThrow();
  });
});

// ─── _verifyConnectedInstance ─────────────────────────────────────────────────

describe('_verifyConnectedInstance — post-connection driver guard', () => {
  let originalConnection;

  beforeEach(() => {
    // Save the real connection object.
    originalConnection = mongoose.connection;
  });

  afterEach(() => {
    // Restore mongoose.connection (it is a getter on the mongoose object;
    // we override it on the instance during tests).
    Object.defineProperty(mongoose, 'connection', {
      value: originalConnection,
      configurable: true,
      writable: true,
    });
  });

  const mockConnection = (overrides) => {
    const base = {
      readyState: 1,
      host: '127.0.0.1',
      port: 27017,
      db: { databaseName: 'novaa-test' },
      disconnect: jest.fn().mockResolvedValue(),
    };
    const conn = Object.assign({}, base, overrides);
    Object.defineProperty(mongoose, 'connection', {
      value: conn,
      configurable: true,
      writable: true,
    });
    return conn;
  };

  // ISO-07: Non-loopback connected host
  test('ISO-07: throws when driver-reported host is not loopback', () => {
    mockConnection({ host: '192.168.1.50' });
    expect(() => _verifyConnectedInstance()).toThrow(/host.*is not a loopback/i);
  });

  // ISO-07b: Remote Atlas-style host
  test('ISO-07b: throws when driver-reported host is remote Atlas host', () => {
    mockConnection({ host: 'cluster0.qgnwh.mongodb.net' });
    expect(() => _verifyConnectedInstance()).toThrow(/host.*is not a loopback/i);
  });

  // ISO-11: Wrong database name post-connection
  test('ISO-11: throws when driver-reported db name is wrong', () => {
    mockConnection({ db: { databaseName: 'smartCollege' } });
    expect(() => _verifyConnectedInstance()).toThrow(/database name.*does not equal/i);
  });

  // ISO-12: readyState not 1
  test('ISO-12: throws when readyState is not 1 (connected)', () => {
    mockConnection({ readyState: 0 });
    expect(() => _verifyConnectedInstance()).toThrow(/readyState !== 1/i);
  });

  // Valid loopback connection passes
  test('passes a valid localhost connection', () => {
    mockConnection({ host: 'localhost' });
    expect(() => _verifyConnectedInstance()).not.toThrow();
  });

  test('passes a valid 127.0.0.1 connection', () => {
    mockConnection({ host: '127.0.0.1' });
    expect(() => _verifyConnectedInstance()).not.toThrow();
  });
});

// ─── clearTestDb — fail-closed guards ────────────────────────────────────────

describe('clearTestDb — fail-closed before deleteMany()', () => {
  let originalConnection;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    originalConnection = mongoose.connection;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    Object.defineProperty(mongoose, 'connection', {
      value: originalConnection,
      configurable: true,
      writable: true,
    });
  });

  const mockConnection = (overrides) => {
    const base = {
      readyState: 1,
      host: '127.0.0.1',
      port: 27017,
      db: { databaseName: 'novaa-test' },
      collections: {},
    };
    const conn = Object.assign({}, base, overrides);
    Object.defineProperty(mongoose, 'connection', {
      value: conn,
      configurable: true,
      writable: true,
    });
    return conn;
  };

  // ISO-06: NODE_ENV not 'test'
  test('ISO-06: blocked when NODE_ENV is not "test"', async () => {
    process.env.NODE_ENV = 'development';
    await expect(clearTestDb()).rejects.toThrow(/NODE_ENV/i);
  });

  // ISO-13: Not connected
  test('ISO-13: blocked when Mongoose readyState is 0 (not connected)', async () => {
    mockConnection({ readyState: 0 });
    await expect(clearTestDb()).rejects.toThrow(/readyState !== 1/i);
  });

  // ISO-14: Wrong database name
  test('ISO-14: blocked when driver-reported database is not novaa-test', async () => {
    mockConnection({ db: { databaseName: 'production' } });
    await expect(clearTestDb()).rejects.toThrow(/must be "novaa-test"/i);
  });

  // ISO-07 (clearTestDb path): Non-loopback host
  test('ISO-07 (clearTestDb): blocked when driver-reported host is non-loopback', async () => {
    mockConnection({ host: '10.0.0.5' });
    await expect(clearTestDb()).rejects.toThrow(/is not a loopback address/i);
  });

  // Verify deleteMany is NOT called on a bad connection
  test('does not call deleteMany when guards fail', async () => {
    const deleteManyMock = jest.fn();
    mockConnection({
      host: '10.0.0.5',
      collections: { users: { deleteMany: deleteManyMock } },
    });
    await expect(clearTestDb()).rejects.toThrow();
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  // Safe path: deleteMany IS called when all guards pass
  test('calls deleteMany when all guards pass', async () => {
    const deleteManyMock = jest.fn().mockResolvedValue({ deletedCount: 0 });
    mockConnection({
      collections: { users: { deleteMany: deleteManyMock } },
    });
    await clearTestDb();
    expect(deleteManyMock).toHaveBeenCalledWith({});
  });
});

// ─── ISO-09: Credential omission from logs ────────────────────────────────────

describe('ISO-09: No credentials appear in console output', () => {
  // We verify by running connectTestDb() in in-memory mode (USE_IN_MEMORY_DB=true)
  // and inspecting what was logged. No network connection is opened.
  test('in-memory connection logs host/port/db but not any credential string', async () => {
    const savedEnv = process.env.USE_IN_MEMORY_DB;
    const savedUri = process.env.MONGO_URI;
    process.env.USE_IN_MEMORY_DB = 'true';
    delete process.env.MONGO_URI;

    const capture = captureLog();
    try {
      await connectTestDb();
      await closeTestDb();
    } finally {
      capture.restore();
      process.env.USE_IN_MEMORY_DB = savedEnv;
      if (savedUri !== undefined) process.env.MONGO_URI = savedUri;
    }

    const fullOutput = capture.lines.join('\n');

    // Must not contain passwords or anything that looks like a credential
    expect(fullOutput).not.toMatch(/password/i);
    expect(fullOutput).not.toMatch(/mongodb\+srv:\/\//i);
    // Must not log a raw mongodb:// URI (which could embed user:pass@)
    expect(fullOutput).not.toMatch(/mongodb:\/\/[^\s]+@/);
    // Must contain the sanitised summary keywords
    expect(fullOutput).toMatch(/host=/i);
    expect(fullOutput).toMatch(/db=/i);
  });
});

// ─── ISO-08: In-memory fallback ───────────────────────────────────────────────

describe('ISO-08: Automatic in-memory fallback', () => {
  test('starts MongoMemoryServer and connects when MONGO_URI is absent', async () => {
    const savedUri = process.env.MONGO_URI;
    delete process.env.MONGO_URI;

    try {
      await connectTestDb();
      expect(mongoose.connection.readyState).toBe(1);
      // Must be a loopback host (127.0.0.1 from MongoMemoryServer)
      expect(['127.0.0.1', 'localhost', '::1']).toContain(
        mongoose.connection.host,
      );
    } finally {
      await closeTestDb();
      if (savedUri !== undefined) process.env.MONGO_URI = savedUri;
    }
  }, 30000); // MongoMemoryServer can take time to start
});
