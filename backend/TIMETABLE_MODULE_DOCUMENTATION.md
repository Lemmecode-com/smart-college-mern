# 📘 Timetable Module - Date-Wise Scheduling Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Schedule Generation](#schedule-generation)
6. [Exception Management](#exception-management)
7. [Caching Strategy](#caching-strategy)
8. [Performance Optimization](#performance-optimization)
9. [Migration Guide](#migration-guide)
10. [Testing](#testing)
11. [Future Enhancements](#future-enhancements)

---

## 🎯 Overview

### **Purpose**

The Timetable module manages class schedules for the Smart College ERP system, supporting:
- **Weekly recurring schedules** (MON-FRI patterns)
- **Date-specific exceptions** (holidays, cancellations, makeup classes)
- **Multi-tenant college isolation**
- **Role-based access control** (HOD, Teacher, Student)

### **Key Features**

✅ **Template + Exceptions Architecture** - Avoids storing every date as separate DB record  
✅ **Dynamic Schedule Generation** - Generates actual calendar dates from weekly patterns  
✅ **Exception Handling** - Supports holidays, cancellations, rescheduling, room/teacher changes  
✅ **Conflict Detection** - Prevents teacher double-booking and room conflicts  
✅ **Caching** - 30-minute TTL cache for fast schedule retrieval  
✅ **HOD Approval Workflow** - Exceptions require HOD approval (audit trail)  

---

## 🏗️ Architecture

### **Template + Exceptions Model**

```
┌─────────────────────────────────────────────────────────┐
│                    TIMETABLE TEMPLATE                    │
│  - college_id, department_id, course_id                 │
│  - semester, academicYear                               │
│  - startDate, endDate, workingDays, timezone            │
│  - status: DRAFT / PUBLISHED / ARCHIVED                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ 1:N
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   TIMETABLE SLOTS                        │
│  - timetable_id (reference to parent)                   │
│  - day: MON, TUE, WED, THU, FRI, SAT                   │
│  - startTime, endTime, subject_id, teacher_id, room     │
│  - slotType: LECTURE / LAB                              │
└─────────────────────────────────────────────────────────┘

          +

┌─────────────────────────────────────────────────────────┐
│                TIMETABLE EXCEPTIONS                      │
│  - timetable_id, slot_id (optional)                     │
│  - exceptionDate: Specific date                         │
│  - type: HOLIDAY / CANCELLED / EXTRA / RESCHEDULED      │
│  - status: PENDING / APPROVED / REJECTED / COMPLETED    │
│  - reason, rescheduledTo, extraSlot, etc.               │
└─────────────────────────────────────────────────────────┘
```

### **How It Works**

1. **HOD creates timetable** → Sets startDate, endDate, workingDays
2. **HOD adds slots** → Defines weekly pattern (MON 9-10: Math, TUE 10-11: Science, etc.)
3. **HOD publishes timetable** → Status changes to PUBLISHED
4. **System generates schedule** → Calculates actual dates from pattern + exceptions
5. **HOD manages exceptions** → Adds holidays, cancels classes, schedules makeup sessions
6. **Students/Teachers view schedule** → See date-wise calendar with exceptions applied

---

## 🗄️ Database Schema

### **1. Timetable Collection**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `college_id` | ObjectId | ✅ | - | College reference |
| `department_id` | ObjectId | ✅ | - | Department reference |
| `course_id` | ObjectId | ✅ | - | Course reference |
| `semester` | Number | ✅ | - | Semester number (1-8) |
| `academicYear` | String | ✅ | - | "2025-2026" |
| `name` | String | ✅ | - | Human-readable name |
| `status` | Enum | ✅ | DRAFT | DRAFT / PUBLISHED / ARCHIVED |
| `startDate` | Date | ✅ | - | When timetable becomes active |
| `endDate` | Date | ✅ | - | When timetable expires |
| `workingDays` | [String] | ✅ | [MON-SAT] | Active days of week |
| `timezone` | String | ✅ | Asia/Kolkata | College timezone |
| `metadata` | Object | ❌ | {} | Additional info |
| `isActive` | Boolean | ✅ | true | Auto-calculated from dates |
| `createdBy` | ObjectId | ❌ | - | HOD who created |

**Indexes:**
- `{ college_id: 1, course_id: 1, semester: 1, academicYear: 1 }` (unique)
- `{ college_id: 1, startDate: 1, endDate: 1, status: 1 }`
- `{ department_id: 1, status: 1, createdAt: -1 }`

---

### **2. TimetableSlot Collection**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `college_id` | ObjectId | ✅ | College reference |
| `timetable_id` | ObjectId | ✅ | Parent timetable |
| `day` | Enum | ✅ | MON / TUE / WED / THU / FRI / SAT / SUN |
| `startTime` | String | ✅ | "09:00" |
| `endTime` | String | ✅ | "10:00" |
| `subject_id` | ObjectId | ✅ | Subject reference |
| `teacher_id` | ObjectId | ✅ | Teacher reference |
| `room` | String | ❌ | Room number |
| `slotType` | Enum | ❌ | LECTURE / LAB |

**Indexes:**
- `{ timetable_id: 1, day: 1, startTime: 1 }`
- `{ college_id: 1, teacher_id: 1, day: 1 }`
- `{ college_id: 1, room: 1, day: 1, startTime: 1 }`

---

### **3. TimetableException Collection**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `college_id` | ObjectId | ✅ | College reference |
| `timetable_id` | ObjectId | ✅ | Timetable reference |
| `slot_id` | ObjectId | ❌ | Specific slot (null for bulk) |
| `exceptionDate` | Date | ✅ | Specific date of exception |
| `type` | Enum | ✅ | HOLIDAY / CANCELLED / EXTRA / RESCHEDULED / ROOM_CHANGE / TEACHER_CHANGE / SPECIAL_EVENT / EXAM |
| `status` | Enum | ✅ | PENDING / APPROVED / REJECTED / COMPLETED |
| `reason` | String | ✅ | Why this exception exists |
| `rescheduledTo` | Date | ❌ | New date for rescheduled class |
| `extraSlot` | Object | ❌ | Details for EXTRA classes |
| `newRoom` | String | ❌ | Changed room |
| `substituteTeacher` | ObjectId | ❌ | Replacement teacher |
| `createdBy` | ObjectId | ✅ | Who created |
| `approvedBy` | ObjectId | ❌ | HOD who approved |
| `approvedAt` | Date | ❌ | When approved |
| `notifyAffected` | Boolean | ✅ | Send notifications |

**Indexes:**
- `{ timetable_id: 1, exceptionDate: 1, type: 1 }`
- `{ college_id: 1, exceptionDate: 1, status: 1 }`
- `{ slot_id: 1, exceptionDate: 1 }`
- `{ "extraSlot.teacher_id": 1, exceptionDate: 1 }`
- `{ substituteTeacher: 1, exceptionDate: 1 }`

---

## 📡 API Endpoints

### **Base URL:** `/api/timetable`

#### **Schedule Endpoints**

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/:id/schedule?startDate=&endDate=` | Teachers/Students | Get date-wise schedule (max 90 days) |
| `GET` | `/:id/schedule/today` | Teachers/Students | Get today's schedule |
| `GET` | `/:id/schedule/week` | Teachers/Students | Get current week's schedule |

#### **Exception Endpoints**

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/:id/exceptions` | HOD only | Create single exception |
| `POST` | `/:id/exceptions/bulk` | HOD only | Create multiple exceptions |
| `GET` | `/:id/exceptions` | Teachers/Students | List exceptions (paginated) |
| `PUT` | `/exceptions/:exceptionId` | HOD only | Update exception |
| `DELETE` | `/exceptions/:exceptionId` | HOD only | Soft delete exception |
| `PUT` | `/exceptions/:exceptionId/approve` | HOD only | Approve exception |
| `PUT` | `/exceptions/:exceptionId/reject` | HOD only | Reject exception |
| `GET` | `/exceptions/pending` | HOD only | View pending approvals |

---

## ⚙️ Schedule Generation

### **Algorithm**

```
Input: timetableId, startDate, endDate

Step 1: Load Timetable Template
  - Get timetable with startDate, endDate, workingDays
  - Return empty if date range is outside timetable period

Step 2: Load All Slots
  - Fetch all TimetableSlots for this timetable
  - Populate subject and teacher details

Step 3: Load Exceptions
  - Fetch all exceptions in date range
  - Group by date and slot_id for O(1) lookup

Step 4: Generate Date Range
  - Create array of dates from startDate to endDate
  - Filter to timetable boundaries if needed

Step 5: Generate Schedule for Each Date
  For each date:
    a. Get day-of-week (MON, TUE, etc.)
    b. Check if working day
    c. Check for HOLIDAY exception
    d. If holiday → skip all slots
    e. If not working day → check for EXTRA exceptions
    f. If working day → get slots for this day
    g. Apply exceptions to each slot (priority order)
    h. Add EXTRA slots if any

Step 6: Cache and Return
  - Cache result with 30-minute TTL
  - Return schedule with summary statistics
```

### **Exception Priority Order**

| Priority | Type | Effect |
|----------|------|--------|
| 8 | HOLIDAY | Cancels entire day |
| 7 | CANCELLED | Cancels specific slot |
| 6 | RESCHEDULED | Moves slot to different date |
| 5 | EXTRA | Adds new slot on non-working day |
| 4 | ROOM_CHANGE | Updates room for slot |
| 3 | TEACHER_CHANGE | Updates teacher for slot |
| 2 | SPECIAL_EVENT | Marks slot as special event |
| 1 | EXAM | Marks slot as exam |

---

## 🚨 Exception Management

### **Exception Types**

#### **1. HOLIDAY**
```json
{
  "exceptionDate": "2025-08-15",
  "type": "HOLIDAY",
  "reason": "Independence Day"
}
```
**Effect:** All slots on this date are cancelled.

---

#### **2. CANCELLED**
```json
{
  "slot_id": "{slotId}",
  "exceptionDate": "2025-09-10",
  "type": "CANCELLED",
  "reason": "Teacher on sick leave",
  "rescheduledTo": "2025-09-17"
}
```
**Effect:** Specific slot is cancelled on this date.

---

#### **3. EXTRA (Makeup Class)**
```json
{
  "exceptionDate": "2025-09-21",
  "type": "EXTRA",
  "reason": "Makeup class for missed lecture",
  "extraSlot": {
    "startTime": "10:00",
    "endTime": "11:00",
    "subject_id": "{subjectId}",
    "teacher_id": "{teacherId}",
    "room": "Room 105"
  }
}
```
**Effect:** Adds new slot on non-working day.

---

#### **4. RESCHEDULED**
```json
{
  "slot_id": "{slotId}",
  "exceptionDate": "2025-09-10",
  "type": "RESCHEDULED",
  "reason": "Teacher conference",
  "rescheduledTo": "2025-09-17"
}
```
**Effect:** Marks slot as moved to different date.

---

#### **5. ROOM_CHANGE**
```json
{
  "slot_id": "{slotId}",
  "exceptionDate": "2025-09-10",
  "type": "ROOM_CHANGE",
  "reason": "Room maintenance",
  "newRoom": "Room 201"
}
```
**Effect:** Updates room for this specific date only.

---

#### **6. TEACHER_CHANGE**
```json
{
  "slot_id": "{slotId}",
  "exceptionDate": "2025-09-10",
  "type": "TEACHER_CHANGE",
  "reason": "Substitute teacher",
  "substituteTeacher": "{teacherId}"
}
```
**Effect:** Updates teacher for this specific date only.

---

### **Approval Workflow**

```
Teacher Requests Exception
         ↓
HOD Reviews (PENDING status)
         ↓
    ┌────┴────┐
    │         │
  APPROVE   REJECT
    │         │
    ↓         ↓
APPROVED  REJECTED
    │         │
    ↓         ↓
Notify    Notify
Students  Students
```

---

## 🚀 Caching Strategy

### **In-Memory LRU Cache**

| Parameter | Value |
|-----------|-------|
| Max Size | 100 schedules |
| Default TTL | 30 minutes |
| Cleanup Interval | 5 minutes |
| Eviction Policy | LRU (Least Recently Used) |

### **Cache Key Format**

```
schedule:{timetableId}:{startDate}:{endDate}
```

### **Cache Invalidation**

Cache is automatically invalidated when:
- Exception is created/updated/deleted
- Timetable is modified
- Timetable status changes (DRAFT → PUBLISHED)

### **When to Use Redis**

For production with multiple server instances, replace in-memory cache with Redis:
```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Replace Map with Redis SET/GET
await redis.setex(cacheKey, 1800, JSON.stringify(schedule)); // 30 min TTL
const cached = await redis.get(cacheKey);
```

---

## ⚡ Performance Optimization

### **Database Indexes**

Run index creation script:
```bash
npm run add-timetable-indexes
```

### **Expected Performance**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Schedule Generation (30 days) | ~800ms | ~50ms (cached) | **16x faster** |
| Exception Lookup | ~200ms | ~30ms (indexed) | **6.7x faster** |
| API Response Time | ~1000ms | ~150ms (cached) | **6.7x faster** |
| Database Load | High | Low (cached) | **80% reduction** |

### **Query Optimization**

✅ **Bulk Exception Fetching** - One query for entire date range  
✅ **Exception Grouping** - O(1) lookup by date and slot_id  
✅ **Date Range Limiting** - Max 90 days per request  
✅ **Selective Population** - Only populate needed fields  

---

## 📊 Migration Guide

### **Step 1: Backup Database**

```bash
mongodump --uri="mongodb://localhost:27017/smart-college-mern" --out=backup/
```

### **Step 2: Run Timetable Migration**

```bash
cd backend
npm run migrate:timetable-dates
```

This will:
- Add `startDate` and `endDate` to existing timetables (calculated from `academicYear`)
- Populate `workingDays` from existing slot patterns
- Set default `timezone` to "Asia/Kolkata"

### **Step 3: Create Indexes**

```bash
npm run add-timetable-indexes
```

### **Step 4: Verify Migration**

```bash
node scripts/migrate-timetable-dates.js
```

Expected output:
```
✅ Total Timetables: 15
   ✅ With startDate/endDate: 15/15
   ✅ With workingDays: 15/15
   ✅ With timezone: 15/15
```

### **Step 5: Test Schedule Generation**

```bash
# Get schedule for a timetable
curl -X GET "http://localhost:5000/api/timetable/{timetableId}/schedule?startDate=2025-09-01&endDate=2025-09-30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🧪 Testing

### **Manual Testing Checklist**

#### **Timetable Creation**
- [ ] HOD can create timetable with startDate, endDate, workingDays
- [ ] Non-HOD teacher cannot create timetable
- [ ] Duplicate timetable prevention (same course + semester + year)
- [ ] Timetable status defaults to DRAFT

#### **Slot Management**
- [ ] HOD can add slots to timetable
- [ ] Slot teacher must match subject's assigned teacher
- [ ] Time conflict detection works
- [ ] Teacher double-booking prevention works

#### **Exception Management**
- [ ] HOD can create HOLIDAY exception
- [ ] HOD can create CANCELLED exception
- [ ] HOD can create EXTRA exception with extraSlot details
- [ ] Teacher conflict detection for EXTRA classes
- [ ] Room conflict detection for EXTRA classes
- [ ] Bulk exception creation works (holiday list)
- [ ] Exception approval workflow works (PENDING → APPROVED)
- [ ] Exception rejection requires reason

#### **Schedule Generation**
- [ ] Schedule returns correct dates for date range
- [ ] Holidays are excluded from schedule
- [ ] Cancelled slots show exception metadata
- [ ] Extra classes appear on non-working days
- [ ] Cache returns same result for repeated requests
- [ ] Cache invalidates after exception creation

#### **Performance**
- [ ] Schedule generation < 500ms for 30 days
- [ ] Cached schedule returns < 100ms
- [ ] 90-day limit enforced
- [ ] No N+1 query issues

---

## 🔮 Future Enhancements

### **Phase 6 Recommendations**

1. **Recurring Exceptions**
   - Support patterns like "every 2nd Saturday is holiday"
   - Store recurrence rules (RRULE format)

2. **Calendar Integration**
   - Export to Google Calendar / Outlook (ICS format)
   - Sync with college academic calendar

3. **Conflict Auto-Resolution**
   - Suggest alternative dates/times for rescheduled classes
   - Auto-find available rooms and teachers

4. **Advanced Analytics**
   - Subject-wise attendance percentage based on actual classes
   - Teacher workload analysis
   - Room utilization metrics

5. **Mobile Notifications**
   - Push notifications for schedule changes
   - Daily reminder of tomorrow's classes

6. **AI-Powered Scheduling**
   - Auto-generate optimal timetable based on constraints
   - Minimize teacher gaps and room conflicts

7. **Multi-Campus Support**
   - Support for colleges with multiple campuses
   - Campus-specific working days and holidays

8. **Student Sectioning**
   - Support for multiple sections within same course
   - Section-specific timetables

---

## 📝 Appendix

### **Error Codes**

| Code | Description |
|------|-------------|
| `TIMETABLE_NOT_FOUND` | Timetable ID doesn't exist |
| `MISSING_FIELDS` | Required fields missing |
| `TEACHER_CONFLICT` | Teacher already booked at this time |
| `ROOM_CONFLICT` | Room already booked at this time |
| `TEACHER_SUBJECT_MISMATCH` | Teacher doesn't match subject's assigned teacher |
| `DUPLICATE_EXCEPTION` | Exception already exists for this date/slot |
| `HOD_ONLY` | Only HOD can perform this action |
| `INVALID_EXTRA` | EXTRA exception missing extraSlot details |
| `INVALID_RESCHEDULE` | RESCHEDULED exception missing rescheduledTo date |
| `EXCEPTION_NOT_PENDING` | Exception already approved/rejected |
| `MISSING_REASON` | Rejection reason required |
| `TOO_MANY_EXCEPTIONS` | Bulk request exceeds 100 limit |

---

## 📞 Support

For issues or questions:
- Check the **Testing Checklist** above
- Review the **Migration Guide** for deployment steps
- Contact the development team for assistance

---

**Last Updated:** April 8, 2026  
**Version:** 2.1.0
