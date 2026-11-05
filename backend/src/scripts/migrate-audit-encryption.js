/**
 * One-time migration: encrypt existing plaintext sensitive fields
 * Run with: node backend/src/scripts/migrate-audit-encryption.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { encrypt } = require('../utils/encryption.util');
const AuditLog = require('../models/auditLog.model');
const SecurityAudit = require('../models/securityAudit.model');

const SENSITIVE_FIELDS = ['endpoint', 'ipAddress', 'userAgent', 'userEmail'];

async function migrate() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI or MONGODB_URI is not set in environment.');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB\n');

  // Migrate AuditLog
  const auditLogs = await AuditLog.find({});
  let migrated = 0;
  for (const log of auditLogs) {
    let needsUpdate = false;
    for (const field of SENSITIVE_FIELDS) {
      if (log[field] && !String(log[field]).startsWith('ENC:')) {
        log[field] = 'ENC:' + encrypt(String(log[field]));
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      await log.save({ validateBeforeSave: false });
      migrated++;
    }
  }
  console.log(`AuditLog: migrated ${migrated}/${auditLogs.length} records`);

  // Migrate SecurityAudit
  const securityLogs = await SecurityAudit.find({});
  let secMigrated = 0;
  for (const log of securityLogs) {
    let needsUpdate = false;
    for (const field of SENSITIVE_FIELDS) {
      if (log[field] && !String(log[field]).startsWith('ENC:')) {
        log[field] = 'ENC:' + encrypt(String(log[field]));
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      await log.save({ validateBeforeSave: false });
      secMigrated++;
    }
  }
  console.log(`SecurityAudit: migrated ${secMigrated}/${securityLogs.length} records`);

  await mongoose.disconnect();
  console.log('\nMigration complete');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});