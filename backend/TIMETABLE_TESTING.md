# 🧪 Timetable Testing Checklist

## 📋 Table of Contents

1. [Unit Tests](#unit-tests)
2. [Integration Tests](#integration-tests)
3. [API Tests](#api-tests)
4. [Performance Tests](#performance-tests)
5. [Edge Cases](#edge-cases)
6. [Security Tests](#security-tests)
7. [User Acceptance Tests](#user-acceptance-tests)
8. [Regression Tests](#regression-tests)

---

## ✅ Unit Tests

### **1. Timetable Model**

- [ ] `startDate` validation (must be before `endDate`)
- [ ] `endDate` validation (must be after `startDate`)
- [ ] `workingDays` validation (non-empty array, valid day names)
- [ ] `timezone` defaults to "Asia/Kolkata"
- [ ] `isActive` auto-calculation based on dates
- [ ] Metadata trimming on save
- [ ] Index creation (verify with explain())

### **2. TimetableException Model**

- [ ] `exceptionDate` validation (within 1 year past/future)
- [ ] Type validation (valid enum values)
- [ ] Status validation (valid enum values)
- [ ] EXTRA type requires `extraSlot` details
- [ ] RESCHEDULED type requires `rescheduledTo` date
- [ ] APPROVED status requires `approvedBy`
- [ ] REJECTED status requires `rejectionReason`
- [ ] Instance methods: `approve()`, `reject()`, `markCompleted()`
- [ ] Static methods: `findByDateRange()`, `findPendingApprovals()`

### **3. Schedule Cache Service**

- [ ] Cache set and get operations
- [ ] TTL expiration
- [ ] LRU eviction when cache is full
- [ ] Cache invalidation by timetable ID
- [ ] Cache invalidation by college ID
- [ ] Periodic cleanup of expired items
- [ ] `getStats()` returns correct counts
- [ ] `clear()` empties cache
- [ ] `destroy()` stops cleanup timer

### **4. Timetable Schedule Service**

- [ ] `generateDateRange()` creates correct date array
- [ ] `isWorkingDay()` checks against workingDays
- [ ] `getDayName()` returns correct day for date
- [ ] `formatDate()` returns YYYY-MM-DD format
- [ ] `groupExceptionsByDate()` creates correct map
- [ ] `sortExceptionsByPriority()` sorts correctly
- [ ] `applyExceptionsToSlot()` applies in priority order
- [ ] Holiday overrides all other exceptions
- [ ] CANCELLED marks slot as cancelled
- [ ] EXTRA adds new slot
- [ ] RESCHEDULED marks slot as rescheduled
- [ ] `generateSchedule()` returns correct structure
- [ ] `getTodaySchedule()` returns only today's date
- [ ] `getWeeklySchedule()` returns Monday-Sunday

---

## ✅ Integration Tests

### **1. Database Indexes**

- [ ] Run `npm run add-timetable-indexes` successfully
- [ ] Verify all indexes exist in MongoDB
- [ ] Test query performance with and without indexes
- [ ] Verify compound indexes work correctly

### **2. Migration Script**

- [ ] Run `npm run migrate:timetable-dates` on test database
- [ ] Verify all timetables have `startDate` and `endDate`
- [ ] Verify `workingDays` populated from existing slots
- [ ] Verify `timezone` set to "Asia/Kolkata"
- [ ] Verify migration is idempotent (safe to run multiple times)
- [ ] Verify migration doesn't overwrite existing values

### **3. Cache Integration**

- [ ] Schedule generation caches result
- [ ] Second request returns cached data
- [ ] Exception creation invalidates cache
- [ ] Exception update invalidates cache
- [ ] Exception deletion invalidates cache
- [ ] Cache TTL expires correctly
- [ ] Cache doesn't grow beyond maxSize

### **4. Exception Validation Service**

- [ ] `checkTeacherConflict()` detects teacher double-booking
- [ ] `checkRoomConflict()` detects room conflicts
- [ ] `validateException()` validates all fields
- [ ] `checkHolidayConflict()` detects existing holidays
- [ ] `getExceptionsForDateRange()` returns correct exceptions
- [ ] `checkTeacherAvailability()` checks teacher status

---

## ✅ API Tests

### **1. Schedule Endpoints**

#### **GET /api/timetable/:id/schedule**

- [ ] Returns 200 with valid date range
- [ ] Returns 400 if startDate/endDate missing
- [ ] Returns 400 if date range > 90 days
- [ ] Returns 400 if startDate > endDate
- [ ] Returns 404 if timetable not found
- [ ] Returns 403 if user doesn't have access
- [ ] Includes timetable metadata
- [ ] Includes schedule array with dates
- [ ] Includes summary statistics
- [ ] Handles empty schedule (no slots)
- [ ] Handles holidays correctly
- [ ] Handles exceptions correctly
- [ ] Returns cached result on second request

#### **GET /api/timetable/:id/schedule/today**

- [ ] Returns today's schedule
- [ ] Returns empty array if no classes today
- [ ] Handles holidays (empty slots)
- [ ] Includes exception metadata

#### **GET /api/timetable/:id/schedule/week**

- [ ] Returns Monday-Sunday schedule
- [ ] Handles week boundaries correctly
- [ ] Includes exception metadata

---

### **2. Exception Endpoints**

#### **POST /api/timetable/:id/exceptions**

- [ ] Creates exception successfully (201)
- [ ] Returns 400 if missing required fields
- [ ] Returns 403 if user is not HOD
- [ ] Returns 404 if timetable not found
- [ ] Returns 409 if duplicate exception
- [ ] Validates teacher conflict for EXTRA
- [ ] Validates room conflict for EXTRA
- [ ] Validates teacher-subject match
- [ ] Auto-approves exception (HOD created)
- [ ] Invalidates cache after creation

#### **POST /api/timetable/:id/exceptions/bulk**

- [ ] Creates multiple exceptions (201)
- [ ] Returns success/failed counts
- [ ] Handles partial failures
- [ ] Returns 400 if > 100 exceptions
- [ ] Returns 400 if not array
- [ ] Skips duplicates with error message

#### **GET /api/timetable/:id/exceptions**

- [ ] Returns paginated exceptions (200)
- [ ] Filters by date range
- [ ] Filters by type
- [ ] Filters by status
- [ ] Filters by slot_id
- [ ] Includes populated fields
- [ ] Returns correct pagination metadata
- [ ] Handles empty result

#### **PUT /api/timetable/exceptions/:exceptionId**

- [ ] Updates exception successfully (200)
- [ ] Returns 404 if exception not found
- [ ] Returns 403 if not HOD
- [ ] Validates conflicts on date/time change
- [ ] Prevents updating COMPLETED exceptions

#### **DELETE /api/timetable/exceptions/:exceptionId**

- [ ] Soft deletes exception (200)
- [ ] Sets isActive = false
- [ ] Returns 404 if not found
- [ ] Returns 403 if not HOD
- [ ] Invalidates cache

#### **PUT /api/timetable/exceptions/:exceptionId/approve**

- [ ] Approves exception (200)
- [ ] Sets status = APPROVED
- [ ] Sets approvedBy and approvedAt
- [ ] Returns 404 if not PENDING
- [ ] Returns 403 if not HOD
- [ ] Invalidates cache

#### **PUT /api/timetable/exceptions/:exceptionId/reject**

- [ ] Rejects exception (200)
- [ ] Sets status = REJECTED
- [ ] Sets rejectedBy, rejectedAt, rejectionReason
- [ ] Returns 400 if rejectionReason missing
- [ ] Returns 404 if not PENDING
- [ ] Returns 403 if not HOD

#### **GET /api/timetable/exceptions/pending**

- [ ] Returns pending exceptions (200)
- [ ] Only shows HOD's department exceptions
- [ ] Returns 403 if not teacher
- [ ] Returns 403 if not HOD
- [ ] Includes populated fields

---

## ✅ Performance Tests

### **1. Response Time Tests**

- [ ] Schedule generation < 500ms (cache miss)
- [ ] Schedule generation < 100ms (cache hit)
- [ ] Exception creation < 300ms
- [ ] Exception list < 200ms
- [ ] Today's schedule < 150ms
- [ ] Weekly schedule < 200ms

### **2. Load Tests**

- [ ] Handle 100 concurrent schedule requests
- [ ] Handle 50 concurrent exception creations
- [ ] Cache doesn't crash under load
- [ ] Database connection pool doesn't exhaust
- [ ] Memory usage stays < 512MB

### **3. Stress Tests**

- [ ] Generate schedule for 90-day range
- [ ] Create 100 exceptions in bulk request
- [ ] Handle 1000 cached schedules (maxSize edge case)
- [ ] Database handles 10,000 exceptions
- [ ] API handles 1000 requests/minute

### **4. Database Query Tests**

- [ ] No N+1 query issues
- [ ] All queries use indexes (check explain())
- [ ] Exception queries use compound indexes
- [ ] Bulk exception fetch (not per-date)
- [ ] Population uses selective fields

---

## ✅ Edge Cases

### **1. Date Edge Cases**

- [ ] Start date = end date (single day)
- [ ] Date range spans multiple months
- [ ] Date range spans multiple years
- [ ] Date range outside timetable boundaries
- [ ] Timetable not yet started
- [ ] Timetable already expired
- [ ] Leap year handling
- [ ] Timezone handling (DST transitions)

### **2. Exception Edge Cases**

- [ ] Multiple exceptions on same date
- [ ] Multiple exceptions on same slot
- [ ] Exception on non-working day
- [ ] Exception on holiday (redundant)
- [ ] EXTRA class on working day
- [ ] Reschedule to holiday
- [ ] Reschedule to non-working day
- [ ] Teacher conflict across multiple timetables
- [ ] Room conflict across multiple timetables

### **3. Schedule Generation Edge Cases**

- [ ] Timetable with no slots
- [ ] Timetable with all days as holidays
- [ ] Timetable with only EXTRA classes
- [ ] Slot with no subject/teacher (populate null safety)
- [ ] Exception with missing fields (validation)
- [ ] Cache key collision (same timetable, different ranges)

### **4. Cache Edge Cases**

- [ ] Cache expires during request
- [ ] Cache full (LRU eviction)
- [ ] Cache invalidation during generation
- [ ] Multiple servers with separate caches
- [ ] Memory leak in cache (monitor over time)

---

## ✅ Security Tests

### **1. Authentication**

- [ ] All endpoints require valid JWT
- [ ] Expired token returns 401
- [ ] Invalid token returns 401
- [ ] Missing token returns 401

### **2. Authorization**

- [ ] Student cannot create exceptions
- [ ] Teacher cannot create exceptions (only HOD)
- [ ] HOD can only manage own department exceptions
- [ ] User cannot access other college's timetables
- [ ] Soft-deleted timetable not accessible
- [ ] Inactive user cannot access endpoints

### **3. Input Validation**

- [ ] SQL injection attempts (MongoDB injection)
- [ ] XSS in exception reason/notes
- [ ] Invalid ObjectId format
- [ ] Negative page/limit values
- [ ] Date format validation
- [ ] Enum value validation

### **4. Rate Limiting**

- [ ] Schedule endpoint rate limited
- [ ] Exception creation rate limited
- [ ] Bulk exception rate limited
- [ ] Rate limit headers present
- [ ] Rate limit exceeded returns 429

### **5. Data Isolation**

- [ ] College A cannot see College B's timetables
- [ ] Department A cannot see Department B's exceptions
- [ ] Student sees only published timetables
- [ ] Teacher sees only own department timetables

---

## ✅ User Acceptance Tests

### **1. HOD User Journey**

- [ ] HOD can create timetable with dates
- [ ] HOD can add slots to timetable
- [ ] HOD can publish timetable
- [ ] HOD can create holiday exception
- [ ] HOD can cancel specific class
- [ ] HOD can schedule makeup class
- [ ] HOD can view pending approvals
- [ ] HOD can approve/reject exceptions
- [ ] HOD receives notifications for exceptions

### **2. Teacher User Journey**

- [ ] Teacher can view own timetable
- [ ] Teacher can view weekly schedule
- [ ] Teacher can view today's classes
- [ ] Teacher sees cancelled classes with reason
- [ ] Teacher sees makeup classes
- [ ] Teacher cannot create exceptions (only HOD)
- [ ] Teacher receives notifications for schedule changes

### **3. Student User Journey**

- [ ] Student can view own timetable
- [ ] Student can view weekly schedule
- [ ] Student can view today's classes
- [ ] Student sees holidays marked
- [ ] Student sees cancelled classes with reason
- [ ] Student sees makeup classes
- [ ] Student cannot create exceptions
- [ ] Student receives notifications for schedule changes

---

## ✅ Regression Tests

### **1. Existing Functionality**

- [ ] Old timetable endpoints still work
- [ ] Student timetable endpoint returns data
- [ ] Teacher weekly timetable works
- [ ] Dashboard timetable displays correctly
- [ ] Slot CRUD operations still work
- [ ] Timetable publish works
- [ ] Timetable delete works

### **2. Database Compatibility**

- [ ] Existing timetables migrate correctly
- [ ] Existing slots not affected
- [ ] Existing attendance records not affected
- [ ] No data loss during migration
- [ ] Backward compatibility maintained

### **3. Frontend Compatibility**

- [ ] StudentTimetable.jsx displays correctly
- [ ] Teacher MyTimetable.jsx displays correctly
- [ ] Dashboard widgets show correct data
- [ ] No breaking changes to API responses
- [ ] Frontend handles new exception metadata

---

## 📊 Test Execution Plan

### **Phase 1: Development Environment**

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run manual API tests (Postman)
# Import Postman collection from TIMETABLE_API_GUIDE.md
```

### **Phase 2: Staging Environment**

```bash
# Deploy to staging
git checkout timetable-date-wise-scheduling
npm install
npm run migrate:timetable-dates
npm run add-timetable-indexes

# Run full test suite
npm test

# Run load tests
npm run test:load

# Manual UAT with stakeholders
```

### **Phase 3: Production Environment**

```bash
# Deploy to production
# Follow TIMETABLE_MIGRATION_DEPLOYMENT.md

# Run smoke tests
curl -f http://localhost:5000/api/health

# Run critical path tests
npm run test:smoke

# Monitor for 24 hours
pm2 logs backend --lines 1000
```

---

## 📈 Test Metrics

### **Pass Criteria:**

- [ ] 100% unit tests passing
- [ ] 100% integration tests passing
- [ ] 95%+ API tests passing
- [ ] Response times within targets
- [ ] No security vulnerabilities found
- [ ] All UAT scenarios pass
- [ ] No regressions found

### **Fail Criteria:**

- Any unit/integration test failing
- Response time > 2x target
- Security vulnerability found
- Data loss during migration
- Breaking changes to existing functionality

---

## 🐛 Bug Reporting Template

If issues found during testing:

```markdown
**Title:** [Brief description of issue]

**Environment:**
- OS: 
- Node.js: 
- MongoDB: 
- Environment (dev/staging/prod): 

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Screenshots/Logs:**
Attach relevant screenshots or log excerpts

**Severity:**
- [ ] Critical (blocks deployment)
- [ ] High (major functionality broken)
- [ ] Medium (minor issue, workaround exists)
- [ ] Low (cosmetic, enhancement)

**Additional Notes:**
Any other relevant information
```

---

## ✅ Sign-Off Checklist

Before marking testing as complete:

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All API tests passing
- [ ] Performance tests passed
- [ ] Edge cases handled
- [ ] Security tests passed
- [ ] UAT completed with stakeholders
- [ ] No critical/high severity bugs
- [ ] Regression tests passed
- [ ] Documentation updated
- [ ] Test results documented
- [ ] Sign-off from QA lead

---

**Test Execution Date:** _____________  
**Tested By:** _____________  
**QA Lead Sign-Off:** _____________  
**Status:** [ ] Pass  [ ] Fail  [ ] Conditional Pass

---

**Last Updated:** April 8, 2026  
**Version:** 2.1.0
