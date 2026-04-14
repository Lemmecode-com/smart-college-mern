# 🚀 Timetable Migration & Deployment Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Migration Steps](#migration-steps)
4. [Post-Migration Verification](#post-migration-verification)
5. [Deployment Steps](#deployment-steps)
6. [Rollback Plan](#rollback-plan)
7. [Production Considerations](#production-considerations)

---

## ✅ Prerequisites

### **System Requirements:**
- Node.js >= 18.x
- MongoDB >= 5.0
- npm >= 9.x
- At least 500MB free disk space for migration backup

### **Required Access:**
- SSH access to production server
- MongoDB admin credentials
- Git access to repository
- Deployment pipeline access (if using CI/CD)

---

## 📋 Pre-Migration Checklist

### **1. Backup Current State**

```bash
# Backup MongoDB database
mongodump \
  --uri="mongodb://username:password@localhost:27017/smart-college-mern" \
  --out=backup/$(date +%Y%m%d_%H%M%S)

# Backup current code version
git tag pre-timetable-migration-$(date +%Y%m%d)
git push origin pre-timetable-migration-$(date +%Y%m%d)
```

### **2. Test in Staging**

```bash
# Deploy to staging environment first
git checkout timetable-date-wise-scheduling
npm install
npm run migrate:timetable-dates
npm run add-timetable-indexes

# Test all endpoints
npm test
```

### **3. Notify Stakeholders**

- [ ] Inform HODs about new exception management features
- [ ] Notify teachers about schedule viewing changes
- [ ] Alert students about timetable display updates
- [ ] Schedule maintenance window (if downtime expected)

### **4. Prepare Rollback Plan**

```bash
# Create rollback script
cat > rollback-timetable.sh << 'EOF'
#!/bin/bash
echo "Rolling back timetable migration..."

# Restore database from backup
mongorestore --uri="mongodb://localhost:27017/smart-college-mern" \
  backup/$(ls -t backup/ | head -1)

# Revert code to previous version
git checkout main
npm install
npm start &

echo "Rollback complete"
EOF

chmod +x rollback-timetable.sh
```

---

## 🔄 Migration Steps

### **Step 1: Deploy New Code**

```bash
# Pull latest changes
git pull origin timetable-date-wise-scheduling

# Install dependencies
cd backend
npm install

# Verify syntax
node -c src/models/timetable.model.js
node -c src/models/timetableException.model.js
node -c src/services/timetableSchedule.service.js
node -c src/services/scheduleCache.service.js
node -c src/controllers/timetableException.controller.js
```

**Expected Output:** No errors

---

### **Step 2: Run Timetable Migration**

```bash
npm run migrate:timetable-dates
```

**What This Does:**
1. Adds `startDate` and `endDate` to existing timetables
2. Populates `workingDays` from existing slot patterns
3. Sets default `timezone` to "Asia/Kolkata"
4. Creates TimetableException indexes

**Expected Output:**
```
🗓️  TIMETABLE DATE-WISE SCHEDULING MIGRATION
======================================================================
Started at: 2026-04-08T10:30:00.000Z
======================================================================

[10:30:01] ℹ️  Connecting to database...
[10:30:01] ✅ Connected to MongoDB
[10:30:01] 🗓️  MIGRATING TIMETABLE DATE FIELDS
[10:30:01] ℹ️  Found 15 timetables to migrate
[10:30:02] 🔄 BSC CS Sem 3 Timetable: 2025-08-01 → 2026-05-30
[10:30:02] 📆 Working days: MON, TUE, WED, THU, FRI, SAT
...
[10:30:05] ✅ Migrated 15/15 timetables

📊 CREATING TIMETABLE EXCEPTION INDEXES
[10:30:05] ✅ Created index: college_1_exceptionDate_1
...
[10:30:06] 📊 Index Summary: 6 created, 0 existing

🔍 VERIFYING TIMETABLE MIGRATION
📊 Total Timetables: 15
   ✅ With startDate/endDate: 15/15
   ✅ With workingDays: 15/15
   ✅ With timezone: 15/15

🎉 Migration completed successfully!
```

---

### **Step 3: Create Additional Indexes**

```bash
npm run add-timetable-indexes
```

**What This Does:**
- Creates performance indexes for timetable queries
- Optimizes exception lookups
- Improves schedule generation speed

**Expected Output:**
```
📊 CREATING TIMETABLE PERFORMANCE INDEXES
======================================================================

📌 timetable collection indexes...
[10:30:10] 🆕 Created index: college_1_startDate_1_endDate_1_status_1
[10:30:10] 🆕 Created index: department_1_status_1_createdAt_-1

📌 timetableslot collection indexes...
[10:30:11] 🆕 Created index: timetable_1_day_1_startTime_1
[10:30:11] 🆕 Created index: college_1_teacher_1_day_1
[10:30:11] 🆕 Created index: college_1_room_1_day_1_startTime_1

📌 timetableexception collection indexes...
[10:30:12] 🆕 Created index: timetable_1_exceptionDate_1_type_1
[10:30:12] 🆕 Created index: college_1_exceptionDate_1_status_1
...

📊 INDEX CREATION SUMMARY
✅ Indexes Created: 9
⚡ Indexes Already Exists: 0
❌ Errors: 0
======================================================================
🎉 All indexes created successfully!
```

---

### **Step 4: Restart Backend Server**

```bash
# Stop current server
pm2 stop backend

# Start with new code
pm2 start backend/src/server.js --name backend

# Check logs
pm2 logs backend --lines 50
```

**Expected Logs:**
```
✅ MongoDB connected
✅ Timetable model loaded
✅ TimetableException model loaded
✅ Schedule cache initialized (maxSize: 100, TTL: 30min)
✅ Server running on port 5000
```

---

## ✅ Post-Migration Verification

### **1. Verify Database State**

```javascript
// Connect to MongoDB
mongo smart-college-mern

// Check timetable fields
db.timetables.find({}, {
  name: 1,
  startDate: 1,
  endDate: 1,
  workingDays: 1,
  timezone: 1
}).pretty()

// Verify all timetables have date fields
db.timetables.countDocuments({
  startDate: { $exists: true },
  endDate: { $exists: true }
})
// Should return same count as:
db.timetables.countDocuments()
```

---

### **2. Test Schedule Generation**

```bash
# Test with curl
curl -X GET \
  "http://localhost:5000/api/timetable/YOUR_TIMETABLE_ID/schedule?startDate=2025-09-01&endDate=2025-09-30" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "timetable": { ... },
    "schedule": [
      {
        "date": "2025-09-01",
        "dayName": "Monday",
        "isWorkingDay": true,
        "slots": [...]
      }
    ],
    "summary": {
      "totalDays": 30,
      "workingDays": 25,
      "totalScheduledSlots": 150
    }
  },
  "message": "Schedule fetched successfully"
}
```

---

### **3. Test Exception Creation**

```bash
# Create holiday exception
curl -X POST \
  "http://localhost:5000/api/timetable/YOUR_TIMETABLE_ID/exceptions" \
  -H "Authorization: Bearer YOUR_HOD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exceptionDate": "2025-10-02",
    "type": "HOLIDAY",
    "reason": "Gandhi Jayanti"
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "exception": {
      "type": "HOLIDAY",
      "status": "APPROVED",
      "exceptionDate": "2025-10-02T00:00:00.000Z"
    }
  },
  "message": "Exception created successfully"
}
```

---

### **4. Test Cache Invalidation**

```bash
# First request (cache miss, ~500ms)
time curl -X GET "http://localhost:5000/api/timetable/ID/schedule?startDate=2025-09-01&endDate=2025-09-07" \
  -H "Authorization: Bearer TOKEN" > /dev/null

# Second request (cache hit, ~50ms)
time curl -X GET "http://localhost:5000/api/timetable/ID/schedule?startDate=2025-09-01&endDate=2025-09-07" \
  -H "Authorization: Bearer TOKEN" > /dev/null

# Create exception (invalidates cache)
curl -X POST "http://localhost:5000/api/timetable/ID/exceptions" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"exceptionDate": "2025-09-05", "type": "HOLIDAY", "reason": "Test"}'

# Third request (cache miss again, ~500ms)
time curl -X GET "http://localhost:5000/api/timetable/ID/schedule?startDate=2025-09-01&endDate=2025-09-07" \
  -H "Authorization: Bearer TOKEN" > /dev/null
```

---

### **5. Monitor Server Health**

```bash
# Check PM2 status
pm2 status

# Check memory usage
pm2 monit

# Check application logs
pm2 logs backend --lines 100

# Look for errors
pm2 logs backend --err --lines 50
```

---

## 🚀 Deployment Steps

### **Production Deployment (Manual)**

```bash
# 1. SSH to production server
ssh deployer@production-server

# 2. Navigate to app directory
cd /var/www/smart-college-mern

# 3. Pull latest changes
git pull origin timetable-date-wise-scheduling

# 4. Install dependencies
cd backend
npm install --production

# 5. Run migration
npm run migrate:timetable-dates

# 6. Run index creation
npm run add-timetable-indexes

# 7. Restart application
pm2 restart backend

# 8. Verify deployment
curl -f http://localhost:5000/api/health || echo "Health check failed"
```

---

### **Production Deployment (CI/CD - GitHub Actions)**

```yaml
# .github/workflows/deploy.yml
name: Deploy Timetable Updates

on:
  push:
    branches: [ timetable-date-wise-scheduling ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd backend && npm install
      
      - name: Run tests
        run: cd backend && npm test
      
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/smart-college-mern
            git pull origin timetable-date-wise-scheduling
            cd backend
            npm install --production
            npm run migrate:timetable-dates
            npm run add-timetable-indexes
            pm2 restart backend
            curl -f http://localhost:5000/api/health
```

---

## 🔄 Rollback Plan

### **When to Rollback:**

- Schedule generation returns errors
- Database migration fails partially
- Server crashes after deployment
- Cache invalidation not working
- Exception creation fails consistently

### **Rollback Steps:**

```bash
# 1. Stop current deployment
pm2 stop backend

# 2. Restore database from backup
LATEST_BACKUP=$(ls -t backup/ | head -1)
mongorestore \
  --uri="mongodb://localhost:27017/smart-college-mern" \
  backup/$LATEST_BACKUP

# 3. Revert code to previous version
git checkout main
git pull origin main

# 4. Reinstall dependencies
cd backend
npm install --production

# 5. Restart server
pm2 start backend/src/server.js --name backend

# 6. Verify rollback
curl -f http://localhost:5000/api/health || echo "Rollback failed"
```

---

## ⚠️ Production Considerations

### **1. Caching in Multi-Server Environment**

**Current:** In-memory cache (per server instance)  
**Problem:** Cache inconsistency across multiple servers  
**Solution:** Use Redis for distributed caching

```javascript
// Install Redis
npm install ioredis

// Update scheduleCache.service.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Replace Map operations with Redis
exports.get = async (key) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

exports.set = async (key, data, ttl = 1800000) => {
  await redis.setex(key, ttl / 1000, JSON.stringify(data));
};

exports.invalidateTimetable = async (timetableId) => {
  const keys = await redis.keys(`*:${timetableId}:*`);
  if (keys.length > 0) {
    await redis.del(keys);
  }
};
```

---

### **2. Rate Limiting**

```javascript
// Install rate limiter
npm install express-rate-limit

// Add to server.js
const rateLimit = require('express-rate-limit');

const scheduleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

// Apply to schedule routes
app.use('/api/timetable/:id/schedule', scheduleLimiter);
```

---

### **3. Error Monitoring**

```javascript
// Install Sentry
npm install @sentry/node

// Add to server.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Catch errors
app.use((err, req, res, next) => {
  Sentry.captureException(err);
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message
    }
  });
});
```

---

### **4. Database Connection Pooling**

```javascript
// Update mongoose connection
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10, // Maximum 10 connections
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

---

### **5. Logging**

```javascript
// Install Winston
npm install winston

// Add logging to schedule service
const logger = require('../utils/logger');

exports.generateSchedule = async (timetableId, startDate, endDate) => {
  logger.info(`Generating schedule for timetable ${timetableId}`, {
    timetableId,
    startDate,
    endDate
  });
  
  // ... schedule generation logic
  
  logger.info(`Schedule generated successfully`, {
    timetableId,
    totalDays: dates.length,
    workingDays: workingDayCount,
    cached: false
  });
  
  return schedule;
};
```

---

### **6. Health Check Endpoint**

```javascript
// Add to server.js
app.get('/api/health', async (req, res) => {
  try {
    // Check MongoDB connection
    await mongoose.connection.db.admin().ping();
    
    // Check cache
    const cacheStats = scheduleCache.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      cache: {
        totalItems: cacheStats.totalItems,
        activeItems: cacheStats.activeItems
      },
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## 📊 Monitoring Dashboard

### **Key Metrics to Track:**

| Metric | Target | Alert If |
|--------|--------|----------|
| Schedule Generation Time | < 500ms | > 1000ms |
| Cache Hit Rate | > 80% | < 50% |
| API Response Time | < 200ms | > 500ms |
| Error Rate | < 1% | > 5% |
| Database CPU | < 60% | > 80% |
| Memory Usage | < 512MB | > 1GB |

---

## ✅ Deployment Checklist

### **Pre-Deployment:**
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database backup created
- [ ] Rollback script prepared
- [ ] Stakeholders notified

### **During Deployment:**
- [ ] Code deployed to staging
- [ ] Migration run in staging
- [ ] All endpoints tested in staging
- [ ] Code deployed to production
- [ ] Migration run in production
- [ ] All endpoints tested in production

### **Post-Deployment:**
- [ ] No errors in logs
- [ ] Cache working correctly
- [ ] Database indexes created
- [ ] Health check passing
- [ ] Monitoring alerts configured
- [ ] Documentation updated

---

## 📞 Support

If issues occur during deployment:

1. **Check logs:** `pm2 logs backend --err`
2. **Verify database:** Check migration script output
3. **Test endpoints:** Use Postman collection
4. **Rollback if needed:** Follow rollback plan above
5. **Contact team:** Reach out to development team for assistance

---

**Last Updated:** April 8, 2026  
**Version:** 2.1.0
