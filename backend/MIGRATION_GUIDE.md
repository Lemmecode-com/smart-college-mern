# 🚀 Database Migration Guide

**Project:** NOVAA - Smart College MERN  
**Version:** 1.0.0  
**Date:** March 6, 2026  
**Database:** MongoDB

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Migration Scripts](#migration-scripts)
4. [Quick Start](#quick-start)
5. [Detailed Usage](#detailed-usage)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [Rollback Procedures](#rollback-procedures)

---

## 📖 Overview

This project includes a comprehensive database migration system that handles:

- **Index Creation**: 80+ performance indexes across 17 collections
- **Data Seeding**: Initial data for Super Admin, colleges, departments, courses, teachers, students
- **Data Migration**: Automatic migration of existing data structures
- **Safe Rollback**: Ability to revert migrations if needed

### Migration Components

| Script | Purpose | Safe to Re-run |
|--------|---------|----------------|
| `migrate.js` | Create indexes + seed initial data | ✅ Yes (idempotent) |
| `seed-data.js` | Populate sample/production data | ✅ Yes (idempotent) |
| `rollback.js` | Remove indexes and/or data | ✅ Yes (idempotent) |

---

## ✅ Prerequisites

### Required

1. **Node.js** v16+ installed
2. **MongoDB** running (local or cloud instance)
3. **Environment Variables** configured in `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/smart-college-mern
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-college-mern

FRONTEND_URL=http://localhost:5173
NODE_ENV=development  # Change to 'production' for production deployments
```

### Optional (for production)

```env
# Production Super Admin credentials (CHANGE THESE!)
SUPER_ADMIN_EMAIL=admin@novaa.edu
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```

---

## 📦 Migration Scripts

### 1. Master Migration (`migrate.js`)

**Purpose:** Complete database setup with indexes and initial data

**What it does:**
- Creates 80+ indexes across all collections
- Creates Super Admin user
- Creates sample college with departments and courses
- Migrates existing data (if applicable)

**Run:**
```bash
npm run migrate
```

### 2. Seed Data (`seed-data.js`)

**Purpose:** Populate database with sample/production data

**Modes:**
- `full` - All sample data (colleges, teachers, students, fees)
- `minimal` - Only colleges, departments, courses
- `users` - Only teachers and students

**Run:**
```bash
npm run seed           # Full seed
npm run seed:minimal   # Minimal seed
npm run seed:users     # Users only
```

### 3. Rollback (`rollback.js`)

**Purpose:** Remove indexes and/or seeded data

**Modes:**
- `indexes` - Remove only indexes (default)
- `data` - Remove indexes + seeded data
- `all` - Drop all collections (⚠️ DANGEROUS)

**Run:**
```bash
npm run rollback           # Indexes only
npm run rollback:data      # Indexes + data
npm run rollback:all       # ⚠️ Drop everything
```

---

## ⚡ Quick Start

### For Fresh Development Setup

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI

# 3. Run migration
npm run migrate

# 4. (Optional) Seed additional sample data
npm run seed

# 5. Start the server
npm start
```

**Default Credentials:**
- **Super Admin:** `admin@novaa.edu` / `Admin@123`
- **Sample Users:** `<email>` / `User@123`

⚠️ **CHANGE THESE PASSWORDS IN PRODUCTION!**

---

## 📖 Detailed Usage

### Running Migrations

#### Full Migration (Recommended for most cases)

```bash
# From project root
node backend/scripts/migrate.js

# Or using npm
npm run migrate
```

**Expected Output:**
```
======================================================================
🚀 NOVAA - SMART COLLEGE MERN
📊 DATABASE MIGRATION SCRIPT
======================================================================

[12:34:56] ℹ️  Connecting to database...
[12:34:57] ✅ Connected to MongoDB

[12:34:57] 📊 CREATING DATABASE INDEXES
[12:34:57] ============================================================
[12:34:57] 📌 attendancerecords collection...
[12:34:57] 🆕 Created index: student_1_college_1
[12:34:57] 🆕 Created index: college_1_session_1
...

[12:35:02] 🌱 SEEDING INITIAL DATA
[12:35:02] ============================================================
[12:35:02] 👤 Creating Super Admin user...
[12:35:02] 🆕 Super Admin created: admin@novaa.edu

[12:35:03] 🏫 Creating sample college...
[12:35:03] 🆕 Sample college created: Demo College of Engineering (DEMO-XYZ123)

======================================================================
📊 MIGRATION SUMMARY
======================================================================
✅ Indexes: 82 created, 0 existing, 0 errors
✅ Seed Data: 1 users, 1 colleges, 5 departments, 10 courses
✅ Migrations: 0 completed, 0 errors
⏱️  Duration: 7.45s
======================================================================

✅ 🎉 Migration completed successfully!
```

#### Seed Data Only

```bash
# Full seed (all sample data)
npm run seed

# Minimal seed (colleges, departments, courses only)
npm run seed:minimal

# Users only (teachers and students)
npm run seed:users
```

### Running Rollbacks

#### Safe Rollback (Indexes Only)

```bash
# Removes all migration-created indexes
npm run rollback
```

#### Data Rollback

```bash
# Removes indexes AND seeded data
npm run rollback:data
```

⚠️ **Warning:** This will delete:
- Super Admin user
- Sample college and all related data
- All seeded teachers and students

#### Complete Drop (⚠️ DANGEROUS)

```bash
# DROPS ALL COLLECTIONS - IRREVERSIBLE!
npm run rollback:all
```

⚠️ **Warning:** This will delete **EVERYTHING** in the database. Use only for fresh starts!

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Connection Failed

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution:**
```bash
# Check if MongoDB is running
# Windows:
net start MongoDB

# Or start mongod manually
mongod --dbpath "C:\data\db"

# Verify connection
mongosh
```

#### 2. Duplicate Key Error

**Error:** `E11000 duplicate key error collection: smart-college-mern.users index: email_1 dup key: { email: "admin@novaa.edu" }`

**Solution:** This is normal - the migration is idempotent. The Super Admin already exists. You can:
- Ignore the error (migration will continue)
- Or run rollback first: `npm run rollback:data`

#### 3. Index Already Exists

**Message:** `Index already exists: student_1_college_1`

**Solution:** This is normal - indexes were created in a previous migration run. The script handles this automatically.

#### 4. Permission Denied (MongoDB Atlas)

**Error:** `not authorized on admin to execute command`

**Solution:**
1. Check MongoDB Atlas user permissions
2. Ensure user has `readWrite` access to the database
3. Verify connection string includes correct database name

#### 5. Migration Partially Completed

**Scenario:** Migration failed midway, some indexes created, some not

**Solution:**
```bash
# Run rollback to clean up
npm run rollback

# Re-run migration
npm run migrate
```

### Checking Migration Status

```bash
# Connect to MongoDB
mongosh

# Check indexes
use smart-college-mern
db.students.getIndexes()
db.users.getIndexes()

# Check data counts
db.users.countDocuments()
db.colleges.countDocuments()
db.students.countDocuments()
```

---

## 📋 Best Practices

### Before Running Migrations

1. **Backup Production Database**
   ```bash
   mongodump --uri="your-production-uri" --out=./backup-$(date +%Y%m%d)
   ```

2. **Test in Development First**
   ```bash
   # Always test migrations locally before production
   npm run migrate
   ```

3. **Review Migration Script**
   - Check what indexes will be created
   - Verify seed data is appropriate
   - Ensure no destructive operations

### Production Deployments

1. **Set NODE_ENV**
   ```env
   NODE_ENV=production
   ```
   This disables sample data creation.

2. **Change Default Credentials**
   ```env
   SUPER_ADMIN_EMAIL=your-secure-email@company.com
   # Change password in code or update after migration
   ```

3. **Run Migration Before Starting Server**
   ```bash
   # Deployment order:
   npm run migrate      # Step 1: Run migration
   npm start            # Step 2: Start server
   ```

4. **Monitor Migration Logs**
   - Save migration output to log file
   - Review for errors
   - Verify index counts

### Development Workflow

```bash
# Daily development
git pull
npm install
npm run migrate        # Ensure indexes are up-to-date
npm start

# When switching branches
git checkout feature-branch
npm run rollback       # Clean up
npm run migrate        # Apply new migrations
npm start
```

---

## 🔄 Rollback Procedures

### Scenario 1: Migration Caused Performance Issues

```bash
# 1. Rollback indexes
npm run rollback

# 2. Investigate issue
# 3. Fix migration script
# 4. Re-run migration
npm run migrate
```

### Scenario 2: Need to Remove Sample Data

```bash
# Remove only sample data, keep indexes
npm run rollback:data

# Re-seed with different data
npm run seed:minimal
```

### Scenario 3: Complete Database Reset

⚠️ **Use only in development!**

```bash
# Drop everything
npm run rollback:all

# Fresh migration
npm run migrate
npm run seed
```

### Scenario 4: Production Rollback

```bash
# 1. Take database offline
# 2. Restore from backup
mongorestore --uri="production-uri" ./backup-YYYYMMDD

# 3. Investigate issue
# 4. Fix and test in development
# 5. Re-deploy
```

---

## 📊 Index Reference

### Collections and Indexes

| Collection | Indexes | Purpose |
|------------|---------|---------|
| `users` | 3 | Email lookup, role filtering |
| `colleges` | 3 | Code/email uniqueness, active filtering |
| `students` | 8 | College/status, department, course, semester lookups |
| `teachers` | 4 | College/status, department lookups |
| `attendancesessions` | 7 | Unique slot validation, teacher/date queries |
| `attendancerecords` | 5 | Student lookup, session queries |
| `studentfees` | 7 | Installment tracking, due date queries |
| `notifications` | 9 | Target filtering, college queries |
| `courses` | 4 | College lookup, duration queries |
| `departments` | 3 | College lookup, name queries |
| `subjects` | 4 | Course/semester, teacher assignment |
| `feestructures` | 3 | Course/semester fee lookup |
| `promotionhistories` | 3 | Student promotion tracking |
| `timetableslots` | 3 | Department, day/time queries |
| `refreshtokens` | 3 | Token lookup, expiry cleanup |
| `tokenblacklists` | 2 | Token validation |
| `passwordresets` | 3 | OTP lookup, expiry cleanup |

**Total:** 80+ indexes across 17 collections

---

## 📞 Support

### Documentation

- [UPDATED_AUDIT_REPORT_MARCH_2026.md](../UPDATED_AUDIT_REPORT_MARCH_2026.md) - Project audit report
- [EMAIL_NOTIFICATIONS_GUIDE.md](./EMAIL_NOTIFICATIONS_GUIDE.md) - Email setup guide
- [README.md](./README.md) - Project README

### Contact

For migration issues or questions, contact the development team with:
- Migration output logs
- MongoDB version
- Node.js version
- Error messages

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | March 6, 2026 | Initial migration system |
| | | - 80+ indexes |
| | | - Super Admin seeding |
| | | - Sample data seeding |
| | | - Rollback support |

---

**Last Updated:** March 6, 2026  
**Maintained By:** NOVAA Development Team
