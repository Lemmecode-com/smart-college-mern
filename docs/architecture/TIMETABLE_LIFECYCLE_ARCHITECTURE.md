# Timetable Lifecycle Management Architecture

**Version:** 1.0  
**Date:** 2026-06-06  
**Status:** Implementation Complete  

---

## 1. Architecture Rationale

### 1.1 Problem Statement

The current timetable deletion logic violates ERP data integrity principles by:
- Blocking deletion of ALL published timetables (overly restrictive)
- Providing misleading error messages about "unpublish" functionality that doesn't exist
- Not considering attendance session history as the determining factor for archival

### 1.2 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Data Immutability** | AttendanceSession and AttendanceRecord history preserved via `slotSnapshot` denormalized data |
| **Terminal State** | ARCHIVED serves as the final lifecycle state (no unpublish) |
| **Explicit Intent** | Users must explicitly archive timetables with attendance rather than delete |
| **Audit Trail** | All archival actions logged with TIMETABLE_ARCHIVED action type |

### 1.3 Lifecycle States

```
┌─────────┐
│  DRAFT  │ ─── Publish ──► ┌───────────┐
└─────────┘                 └───────────┘
                                │
                                │ (has attendance)
                                ▼
                         ┌───────────┐
                         │  ARCHIVED │ ◄── Archive
                         └───────────┘
                                │
                                │ (no attendance)
                                ▼
                         ┌───────────┐
                         │  DELETED  │ (physical delete)
                         └───────────┘
```

---

## 2. Implementation Summary

### 2.1 Backend Changes

| File | Change |
|------|--------|
| `timetable.controller.js` | Added `archiveTimetable` function; Modified `deleteTimetable` to check attendance sessions |
| `timetable.routes.js` | Added `PUT /:id/archive` route |
| `auditLog.model.js` | Added `TIMETABLE_ARCHIVED` and `TIMETABLE_PUBLISHED` action enums |

### 2.2 Frontend Changes

| File | Change |
|------|--------|
| `TimetableList.jsx` | Added Archive button (HOD, PUBLISHED only); Updated status badge styling for ARCHIVED; Added Archived stat counter |

---

## 3. API Design

### 3.1 New Endpoint: Archive Timetable

```
PUT /api/timetable/:id/archive
Authorization: HOD (same department) or COLLEGE_ADMIN
```

**Response (200):**
```json
{
  "success": true,
  "message": "Timetable archived successfully",
  "data": {
    "timetable": {
      "_id": "timetableId",
      "status": "ARCHIVED"
    }
  }
}
```

### 3.2 Modified Endpoint: Delete Timetable

```
DELETE /api/timetable/:id
Authorization: HOD (same department) or COLLEGE_ADMIN
```

**New Business Rules:**
- If timetable has NO attendance sessions → Allow deletion (physical)
- If timetable has attendance sessions → Block with error message

---

## 4. Read API Audit (PHASE 3) - COMPLETED

All read APIs now exclude ARCHIVED timetables:

| API | Change | Status |
|-----|--------|--------|
| `getTimetableById` | Added `if (timetable.status === "ARCHIVED") return 404` | ✅ Done |
| `getWeeklyTimetableById` | Added `if (timetable.status === "ARCHIVED") return 404` | ✅ Done |
| `getSchedule` | Added `if (timetable.status === "ARCHIVED") return 404` | ✅ Done |
| `getTodaySchedule` | Added `if (timetable.status === "ARCHIVED") return 404` | ✅ Done |
| `getWeeklySchedule` | Added `if (timetable.status === "ARCHIVED") return 404` | ✅ Done |

**Note:** `getWeeklyTimetableForTeacher`, `getStudentTimetable`, `getStudentTodayTimetable` already filter by `status: "PUBLISHED"` via Mongoose populate match.

---

## 5. Frontend Button Visibility Rules

| Status | Archive | Delete | Publish | Edit |
|--------|---------|--------|---------|------|
| **DRAFT** | Hidden | Visible (HOD) | Visible (HOD) | Visible (HOD) |
| **PUBLISHED** | Visible (HOD) | Hidden | Hidden | Hidden |
| **ARCHIVED** | Hidden | Hidden | Hidden | Hidden |

---

## 6. Migration Impact

**No schema changes required.** ARCHIVED already exists in `timetable.model.js` enum.

**Audit Log Migration Required:**
```javascript
// Add to auditLog.model.js action enum:
"TIMETABLE_ARCHIVED",
"TIMETABLE_PUBLISHED",
```

---

## 7. Test Cases

| Test Case | Expected Result |
|-----------|-----------------|
| Delete DRAFT timetable (no attendance) | Success - timetable deleted |
| Delete PUBLISHED timetable (no attendance) | Success - timetable deleted |
| Delete PUBLISHED timetable (with attendance) | Error: "must be archived instead" |
| Archive DRAFT timetable | Status → ARCHIVED |
| Archive PUBLISHED timetable | Status → ARCHIVED, audit logged |
| Publish ARCHIVED timetable | Error: "Cannot publish archived timetable" |
| GET /timetable/student (ARCHIVED exists) | Returns only PUBLISHED |