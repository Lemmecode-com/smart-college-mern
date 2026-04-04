# 🔐 User Active/Deactive/Reactive Feature - Implementation Plan

**Document Version:** 1.0  
**Date:** April 3, 2026  
**Prepared For:** Project Manager / Stakeholders  
**Status:** Ready for Review & Approval

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Gap Analysis](#gap-analysis)
4. [Proposed Solution](#proposed-solution)
5. [Pros & Cons](#pros--cons)
6. [Technical Implementation Plan](#technical-implementation-plan)
7. [Database Schema Changes](#database-schema-changes)
8. [API Endpoints](#api-endpoints)
9. [Frontend Changes](#frontend-changes)
10. [Middleware & Security Updates](#middleware--security-updates)
11. [Migration Strategy](#migration-strategy)
12. [Testing Strategy](#testing-strategy)
13. [Timeline & Effort Estimation](#timeline--effort-estimation)
14. [Risk Assessment](#risk-assessment)
15. [Rollback Plan](#rollback-plan)

---

## 1. Executive Summary

### What We're Building

A **user account status management system** that allows **College Admins** to:

- ✅ **Deactivate** a Teacher or Student account
- ✅ **Reactivate** a previously deactivated account
- ✅ **View** current account status
- ✅ **Provide reason** for deactivation (optional but recommended)

When a user is **deactivated**:

- ❌ They **cannot log in** to the system
- ❌ They **cannot perform any operations** (view profile, update info, access dashboard, etc.)
- ❌ Their existing sessions are **invalidated**
- ✅ Their **data is preserved** (soft deactivation, not deletion)
- ✅ They can be **reactivated** at any time by College Admin

### Why This Matters

Currently, the system has:

- ✅ Student approval workflow (PENDING → APPROVED/REJECTED)
- ✅ Teacher status (ACTIVE/INACTIVE) but **no deactivation enforcement**
- ✅ College-level deactivation (Super Admin can deactivate entire college)
- ❌ **NO individual user deactivation by College Admin**

This feature fills a critical gap in user lifecycle management and provides College Admins with proper control over their users.

---

## 2. Current System Analysis

### 2.1 Existing User Status Management

#### **Student Model** (`backend/src/models/student.model.js`)

```javascript
status: {
  type: String,
  enum: ["PENDING", "APPROVED", "REJECTED", "DELETED", "ALUMNI"],
  default: "PENDING"
}
```

- Used for **admission approval workflow**
- NOT used for account deactivation
- Missing: `isActive` or `isDeactivated` field

#### **Teacher Model** (`backend/src/models/teacher.model.js`)

```javascript
status: {
  type: String,
  enum: ["ACTIVE", "INACTIVE"],
  default: "ACTIVE"
}
```

- Has status field but **NOT enforced during login or operations**
- Can be set to INACTIVE via update, but teacher can still log in
- Missing: Proper deactivation enforcement

#### **User Model** (`backend/src/models/user.model.js`)

```javascript
// Current fields only:
(college_id, name, email, password, role);
```

- ❌ **NO `isActive` field** (despite being referenced in implementation plans)
- ❌ NO deactivationReason field
- ❌ NO deactivatedAt timestamp

### 2.2 Current Login Flow

#### **Student Login:**

1. Find Student by email
2. Check status:
   - `PENDING` → Blocked (403: Account pending approval)
   - `REJECTED` → Blocked (403: Account rejected)
   - `APPROVED` → Proceed
3. Find User record, verify password
4. Generate JWT tokens

#### **Teacher Login:**

1. Find Teacher by email with `status: "ACTIVE"`
2. Verify password against Teacher.password
3. Generate JWT tokens

**Gap Identified:**

- ✅ Student login checks status correctly
- ❌ Teacher login checks `ACTIVE` status but doesn't block `INACTIVE` teachers
- ❌ No unified `isActive` check on User model
- ❌ No check for deactivated users in middleware

### 2.3 Current Middleware Protection

| Middleware              | Purpose            | Current Check                           |
| ----------------------- | ------------------ | --------------------------------------- |
| `auth.middleware.js`    | JWT validation     | ✅ Checks token validity                |
| `role.middleware.js`    | Role-based access  | ✅ Checks user role                     |
| `college.middleware.js` | College isolation  | ✅ Checks college.isActive              |
| `student.middleware.js` | Student validation | ✅ Checks student.status === "APPROVED" |
| `teacher.middleware.js` | Teacher validation | ✅ Checks teacher.status === "ACTIVE"   |

**Gap Identified:** No middleware checks for user deactivation status.

---

## 3. Gap Analysis

### What's Missing

| Feature                              | Current State        | Required State                     |
| ------------------------------------ | -------------------- | ---------------------------------- |
| User deactivation field              | ❌ Not in User model | ✅ Add `isActive` boolean          |
| Deactivation reason                  | ❌ Not tracked       | ✅ Add `deactivationReason` string |
| Deactivation timestamp               | ❌ Not tracked       | ✅ Add `deactivatedAt` date        |
| Deactivated by tracking              | ❌ Not tracked       | ✅ Add `deactivatedBy` ref         |
| Login blocking for deactivated users | ❌ Not enforced      | ✅ Block at login                  |
| Session invalidation on deactivation | ❌ Not implemented   | ✅ Invalidate existing tokens      |
| API endpoint to deactivate user      | ❌ Doesn't exist     | ✅ Create endpoint                 |
| API endpoint to reactivate user      | ❌ Doesn't exist     | ✅ Create endpoint                 |
| Frontend UI for deactivation         | ❌ Doesn't exist     | ✅ Add toggle/switch               |
| Bulk deactivation                    | ❌ Doesn't exist     | ✅ Optional feature                |
| Deactivation audit log               | ❌ Doesn't exist     | ✅ Recommended                     |

---

## 4. Proposed Solution

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COLLEGE ADMIN UI                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Teachers List│  │ Students List│  │ User Management │  │
│  │              │  │              │  │ Dashboard       │  │
│  │ [Deactivate] │  │ [Deactivate] │  │ [Bulk Actions]  │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PUT  /api/users/:id/deactivate                      │  │
│  │  PUT  /api/users/:id/reactivate                      │  │
│  │  GET  /api/users/:id/status                          │  │
│  │  POST /api/users/bulk/deactivate                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ User         │  │ Student      │  │ Teacher         │  │
│  │ - isActive   │  │ - status     │  │ - status        │  │
│  │ - reason     │  │              │  │                 │  │
│  │ - deactivated│  │              │  │                 │  │
│  │   At/By      │  │              │  │                 │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Status Flow Diagram

```
Student Lifecycle:
┌─────────┐     Approve      ┌──────────┐
│ PENDING ├─────────────────►│ APPROVED │
└─────────                  └────┬─────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ DELETED  │ │ ALUMNI   │ │DEACTIVATED│
              └──────────┘ └────────── └─────────┘
                                             │
                                        Reactivate
                                             ▼
                                       ┌──────────┐
                                       │ APPROVED │
                                       └──────────

Teacher Lifecycle:
┌──────────┐   Deactivate   ┌──────────┐
│  ACTIVE  ├───────────────►│ INACTIVE │
└──────────                └────┬─────┘
                                 │
                            Reactivate
                                 ▼
                           ┌──────────┐
                           │  ACTIVE  │
                           └──────────
```

---

## 5. Pros & Cons

### ✅ Pros (Advantages)

| #   | Benefit                   | Description                                                                    |
| --- | ------------------------- | ------------------------------------------------------------------------------ |
| 1   | **Complete User Control** | College Admins gain full control over user lifecycle                           |
| 2   | **Security Enhancement**  | Deactivated users immediately lose access to all resources                     |
| 3   | **Audit Trail**           | Track who deactivated whom and when, with optional reason                      |
| 4   | **Data Preservation**     | Soft deactivation preserves all historical data (grades, attendance, payments) |
| 5   | **Reversible**            | Can reactivate users without data loss                                         |
| 6   | **Compliance Ready**      | Meets institutional requirements for account management                        |
| 7   | **Session Invalidation**  | Deactivated users' active sessions are immediately terminated                  |
| 8   | **Consistent UX**         | Unified approach for both Teachers and Students                                |
| 9   | **Bulk Operations**       | Option to deactivate multiple users at once (future enhancement)               |
| 10  | **Minimal Code Changes**  | Leverages existing status fields, adds minimal new fields                      |

### ❌ Cons (Disadvantages & Risks)

| #   | Risk                            | Mitigation                                                                      |
| --- | ------------------------------- | ------------------------------------------------------------------------------- |
| 1   | **Accidental Deactivation**     | Add confirmation modal + reason field + undo within 5 minutes                   |
| 2   | **Broken References**           | Ensure deactivation doesn't break course/subject/attendance references          |
| 3   | **Email Notifications Pending** | Deactivated users won't receive emails (expected behavior)                      |
| 4   | **Payment Processing Issues**   | Check if deactivated users have pending payments before allowing deactivation   |
| 5   | **Attendance Records**          | Deactivation doesn't affect historical attendance data (by design)              |
| 6   | **Notification Spam**           | If reactivated, user may receive backlog of notifications                       |
| 7   | **API Complexity**              | Need to handle deactivation checks in multiple middleware layers                |
| 8   | **Testing Overhead**            | Requires comprehensive testing across all user flows                            |
| 9   | **Migration Risk**              | Existing database needs migration to set `isActive: true` for all current users |
| 10  | **User Confusion**              | Need clear UI messaging explaining deactivation vs deletion                     |

### ⚖️ Risk vs Benefit Analysis

**Overall Verdict: ✅ RECOMMENDED FOR IMPLEMENTATION**

The benefits significantly outweigh the risks. The feature is critical for proper user lifecycle management and the risks can be mitigated through:

- Proper validation (prevent deactivating users with pending payments)
- Confirmation modals with reason tracking
- Comprehensive testing
- Clear rollback procedures

---

## 6. Technical Implementation Plan

### Phase 1: Database Schema Changes (Day 1)

#### 6.1 Update User Model

**File:** `backend/src/models/user.model.js`

**Add fields:**

```javascript
isActive: {
  type: Boolean,
  default: true,
  index: true
},
deactivationReason: {
  type: String,
  default: null,
  maxlength: 500
},
deactivatedAt: {
  type: Date,
  default: null
},
deactivatedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
}
```

#### 6.2 Update Student Model

**File:** `backend/src/models/student.model.js`

**Add field:**

```javascript
// Extend status enum to include DEACTIVATED
status: {
  type: String,
  enum: ["PENDING", "APPROVED", "REJECTED", "DELETED", "ALUMNI", "DEACTIVATED"],
  default: "PENDING"
}
```

#### 6.3 Teacher Model

**File:** `backend/src/models/teacher.model.js`

**No changes needed** - already has `status: ["ACTIVE", "INACTIVE"]`

#### 6.4 Create Migration Script

**File:** `backend/scripts/migrate-user-active-status.js`

```javascript
// Set isActive: true for all existing users
db.users.updateMany(
  { isActive: { $exists: false } },
  { $set: { isActive: true } },
);

// Set status: "DEACTIVATED" for students with problematic status
db.students.updateMany(
  { status: { $in: ["PENDING", "REJECTED"] } },
  { $set: { status: "APPROVED" } }, // Or handle as needed
);
```

---

### Phase 2.5: Resource Ownership & Reassignment Workflow (CRITICAL)

This section addresses a critical business requirement: **When deactivating a teacher who owns resources (subjects, courses, classes, etc.), those resources must be reassigned to another teacher before deactivation can proceed.**

#### 6.5.1 Resource Ownership Scenarios

When a teacher is deactivated, the system must check for ownership of the following resources:

| Resource Type             | Model             | Ownership Field              | Impact if Not Reassigned                                  |
| ------------------------- | ----------------- | ---------------------------- | --------------------------------------------------------- |
| **Subjects**              | Subject           | `teacher_id`                 | Students can't see subject, no teacher to mark attendance |
| **Courses**               | Course            | `coordinator_id` (if exists) | Course has no coordinator                                 |
| **Classes/Sections**      | Class/Section     | `class_teacher_id`           | Class has no class teacher                                |
| **Timetable Slots**       | TimetableSlot     | `teacher_id`                 | Timetable shows deactivated teacher                       |
| **Attendance Sessions**   | AttendanceSession | `teacher_id`                 | Attendance marked by deactivated teacher                  |
| **Assignments**           | Assignment        | `created_by`                 | Students can't submit to deactivated teacher              |
| **Exam Schedules**        | ExamSchedule      | `invigilator_id`             | Exam has no invigilator                                   |
| **Student Fees Approval** | StudentFee        | `approved_by`                | Fee approvals show deactivated teacher                    |
| **Notifications**         | Notification      | `created_by`                 | Notifications show deactivated teacher as creator         |
| **Document Reviews**      | DocumentReview    | `reviewer_id`                | Document reviews stuck                                    |

#### 6.5.2 Deactivation Blocking Logic

**Rule:** A teacher **CANNOT be deactivated** if they own any active resources. The College Admin must first reassign all resources to another teacher.

**Backend Validation Flow:**

```javascript
// In deactivateUser controller - Enhanced resource check

if (user.role === "TEACHER") {
  const teacher = await Teacher.findOne({ user_id: id });
  if (!teacher) {
    return res.status(404).json({ error: "Teacher record not found" });
  }

  // COMPREHENSIVE RESOURCE OWNERSHIP CHECK
  const resourceCheck = await checkTeacherResourceOwnership(
    teacher._id,
    req.college_id,
  );

  if (resourceCheck.hasOwnership) {
    return res.status(400).json({
      error: "CANNOT_DEACTIVATE_TEACHER",
      message: `Cannot deactivate teacher. They own ${resourceCheck.totalResources} active resource(s).`,
      requiresReassignment: true,
      resources: resourceCheck.resources,
      summary: resourceCheck.summary,
    });
  }

  // Proceed with deactivation if no resources owned
  // ... rest of deactivation logic
}

/**
 * Check all resources owned by a teacher
 * Returns detailed breakdown of what needs reassignment
 */
async function checkTeacherResourceOwnership(teacherId, collegeId) {
  const resources = {};
  let totalResources = 0;

  // 1. SUBJECTS (Most Critical)
  const subjects = await Subject.find({
    teacher_id: teacherId,
    isActive: true,
    college_id: collegeId,
  }).select("name code semester department_id");

  if (subjects.length > 0) {
    resources.subjects = {
      count: subjects.length,
      items: subjects.map((s) => ({
        id: s._id,
        name: s.name,
        code: s.code,
        semester: s.semester,
        department: s.department_id,
      })),
      requiresReassignment: true,
      priority: "CRITICAL",
      message: `${subjects.length} subject(s) need reassignment to another teacher`,
    };
    totalResources += subjects.length;
  }

  // 2. TIMETABLE SLOTS
  const timetableSlots = await TimetableSlot.find({
    teacher_id: teacherId,
    isActive: true,
    college_id: collegeId,
  }).select("day startTime endTime subject_id class_id");

  if (timetableSlots.length > 0) {
    resources.timetableSlots = {
      count: timetableSlots.length,
      items: timetableSlots,
      requiresReassignment: true,
      priority: "HIGH",
      message: `${timetableSlots.length} timetable slot(s) need reassignment`,
    };
    totalResources += timetableSlots.length;
  }

  // 3. ATTENDANCE SESSIONS (Active/Ongoing)
  const activeSessions = await AttendanceSession.find({
    teacher_id: teacherId,
    status: { $in: ["ACTIVE", "SCHEDULED"] },
    college_id: collegeId,
  }).select("subject_id class_id scheduledAt status");

  if (activeSessions.length > 0) {
    resources.attendanceSessions = {
      count: activeSessions.length,
      items: activeSessions,
      requiresReassignment: true,
      priority: "HIGH",
      message: `${activeSessions.length} active attendance session(s) need reassignment`,
    };
    totalResources += activeSessions.length;
  }

  // 4. ASSIGNMENTS (Active/Not Expired)
  const activeAssignments = await Assignment.find({
    created_by: teacherId,
    status: "ACTIVE",
    college_id: collegeId,
    $or: [{ dueDate: { $gte: new Date() } }, { dueDate: null }],
  }).select("title subject_id dueDate status");

  if (activeAssignments.length > 0) {
    resources.assignments = {
      count: activeAssignments.length,
      items: activeAssignments,
      requiresReassignment: true,
      priority: "MEDIUM",
      message: `${activeAssignments.length} active assignment(s) need reassignment`,
    };
    totalResources += activeAssignments.length;
  }

  // 5. CLASS TEACHER RESPONSIBILITIES
  const classTeacherClasses = await Class.find({
    class_teacher_id: teacherId,
    isActive: true,
    college_id: collegeId,
  }).select("name section semester department_id");

  if (classTeacherClasses.length > 0) {
    resources.classTeacherClasses = {
      count: classTeacherClasses.length,
      items: classTeacherClasses,
      requiresReassignment: true,
      priority: "CRITICAL",
      message: `${classTeacherClasses.length} class(es) need new class teacher`,
    };
    totalResources += classTeacherClasses.length;
  }

  // 6. COURSE COORDINATOR
  const coordinatedCourses = await Course.find({
    coordinator_id: teacherId,
    isActive: true,
    college_id: collegeId,
  }).select("name code department_id");

  if (coordinatedCourses.length > 0) {
    resources.coordinatedCourses = {
      count: coordinatedCourses.length,
      items: coordinatedCourses,
      requiresReassignment: true,
      priority: "HIGH",
      message: `${coordinatedCourses.length} course(s) need new coordinator`,
    };
    totalResources += coordinatedCourses.length;
  }

  // 7. EXAM INVIGILATION DUTIES
  const examDuties = await ExamSchedule.find({
    invigilator_id: teacherId,
    status: { $in: ["SCHEDULED", "ONGOING"] },
    college_id: collegeId,
  }).select("examName date startTime endTime venue");

  if (examDuties.length > 0) {
    resources.examDuties = {
      count: examDuties.length,
      items: examDuties,
      requiresReassignment: true,
      priority: "CRITICAL",
      message: `${examDuties.length} exam duty(ies) need reassignment`,
    };
    totalResources += examDuties.length;
  }

  return {
    hasOwnership: totalResources > 0,
    totalResources,
    resources,
    summary: {
      critical:
        (resources.subjects?.count || 0) +
        (resources.classTeacherClasses?.count || 0) +
        (resources.examDuties?.count || 0),
      high:
        (resources.timetableSlots?.count || 0) +
        (resources.attendanceSessions?.count || 0) +
        (resources.coordinatedCourses?.count || 0),
      medium: resources.assignments?.count || 0,
      low: 0,
    },
  };
}
```

#### 6.5.3 Resource Reassignment API Endpoints

**New Endpoint: Get Teacher's Resources**

```javascript
// GET /api/teachers/:id/resources
// Returns all resources owned by a teacher that need reassignment
exports.getTeacherResources = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const resourceCheck = await checkTeacherResourceOwnership(
      teacher._id,
      req.college_id,
    );

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department_id,
      },
      canDeactivate: !resourceCheck.hasOwnership,
      ...resourceCheck,
    });
  } catch (error) {
    console.error("Get teacher resources error:", error);
    res.status(500).json({ error: "Failed to fetch teacher resources" });
  }
};
```

**New Endpoint: Reassign Teacher's Resources**

```javascript
// POST /api/teachers/:id/reassign-resources
// Bulk reassign all resources from one teacher to another
exports.reassignTeacherResources = async (req, res) => {
  try {
    const { id: fromTeacherId } = req.params;
    const { toTeacherId, resourceTypes } = req.body;
    const adminId = req.user.id;

    // Validate both teachers exist and belong to same college
    const fromTeacher = await Teacher.findById(fromTeacherId);
    const toTeacher = await Teacher.findById(toTeacherId);

    if (!fromTeacher || !toTeacher) {
      return res.status(404).json({ error: "One or both teachers not found" });
    }

    if (fromTeacher.college_id.toString() !== toTeacher.college_id.toString()) {
      return res
        .status(400)
        .json({ error: "Both teachers must belong to the same college" });
    }

    if (fromTeacherId === toTeacherId) {
      return res
        .status(400)
        .json({ error: "Cannot reassign resources to the same teacher" });
    }

    // Validate toTeacher is active
    if (toTeacher.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ error: "Cannot assign resources to an inactive teacher" });
    }

    const results = {
      reassigned: [],
      failed: [],
      skipped: [],
    };

    // 1. Reassign Subjects
    if (!resourceTypes || resourceTypes.includes("subjects")) {
      const subjectResult = await Subject.updateMany(
        { teacher_id: fromTeacherId, isActive: true },
        {
          $set: {
            teacher_id: toTeacherId,
            reassignedAt: new Date(),
            reassignedBy: adminId,
            previousTeacher: fromTeacherId,
          },
        },
      );

      if (subjectResult.modifiedCount > 0) {
        results.reassigned.push({
          type: "subjects",
          count: subjectResult.modifiedCount,
          message: `${subjectResult.modifiedCount} subject(s) reassigned`,
        });
      }
    }

    // 2. Reassign Timetable Slots
    if (!resourceTypes || resourceTypes.includes("timetableSlots")) {
      const slotResult = await TimetableSlot.updateMany(
        { teacher_id: fromTeacherId, isActive: true },
        { $set: { teacher_id: toTeacherId } },
      );

      if (slotResult.modifiedCount > 0) {
        results.reassigned.push({
          type: "timetableSlots",
          count: slotResult.modifiedCount,
          message: `${slotResult.modifiedCount} timetable slot(s) reassigned`,
        });
      }
    }

    // 3. Reassign Attendance Sessions
    if (!resourceTypes || resourceTypes.includes("attendanceSessions")) {
      const sessionResult = await AttendanceSession.updateMany(
        { teacher_id: fromTeacherId, status: { $in: ["ACTIVE", "SCHEDULED"] } },
        { $set: { teacher_id: toTeacherId } },
      );

      if (sessionResult.modifiedCount > 0) {
        results.reassigned.push({
          type: "attendanceSessions",
          count: sessionResult.modifiedCount,
          message: `${sessionResult.modifiedCount} attendance session(s) reassigned`,
        });
      }
    }

    // 4. Reassign Class Teacher Responsibilities
    if (!resourceTypes || resourceTypes.includes("classTeacherClasses")) {
      const classResult = await Class.updateMany(
        { class_teacher_id: fromTeacherId, isActive: true },
        { $set: { class_teacher_id: toTeacherId } },
      );

      if (classResult.modifiedCount > 0) {
        results.reassigned.push({
          type: "classTeacherClasses",
          count: classResult.modifiedCount,
          message: `${classResult.modifiedCount} class(es) reassigned`,
        });
      }
    }

    // 5. Reassign Course Coordinator
    if (!resourceTypes || resourceTypes.includes("coordinatedCourses")) {
      const courseResult = await Course.updateMany(
        { coordinator_id: fromTeacherId, isActive: true },
        { $set: { coordinator_id: toTeacherId } },
      );

      if (courseResult.modifiedCount > 0) {
        results.reassigned.push({
          type: "coordinatedCourses",
          count: courseResult.modifiedCount,
          message: `${courseResult.modifiedCount} course(s) reassigned`,
        });
      }
    }

    // 6. Reassign Assignments
    if (!resourceTypes || resourceTypes.includes("assignments")) {
      const assignmentResult = await Assignment.updateMany(
        { created_by: fromTeacherId, status: "ACTIVE" },
        { $set: { created_by: toTeacherId } },
      );

      if (assignmentResult.modifiedCount > 0) {
        results.reassigned.push({
          type: "assignments",
          count: assignmentResult.modifiedCount,
          message: `${assignmentResult.modifiedCount} assignment(s) reassigned`,
        });
      }
    }

    // 7. Reassign Exam Duties
    if (!resourceTypes || resourceTypes.includes("examDuties")) {
      const examResult = await ExamSchedule.updateMany(
        {
          invigilator_id: fromTeacherId,
          status: { $in: ["SCHEDULED", "ONGOING"] },
        },
        { $set: { invigilator_id: toTeacherId } },
      );

      if (examResult.modifiedCount > 0) {
        results.reassigned.push({
          type: "examDuties",
          count: examResult.modifiedCount,
          message: `${examResult.modifiedCount} exam duty(ies) reassigned`,
        });
      }
    }

    // Create audit log
    await AuditLog.create({
      action: "TEACHER_RESOURCES_REASSIGNED",
      performedBy: adminId,
      fromTeacher: fromTeacherId,
      toTeacher: toTeacherId,
      details: results,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `Resources reassigned from ${fromTeacher.name} to ${toTeacher.name}`,
      summary: {
        totalReassigned: results.reassigned.reduce(
          (sum, r) => sum + r.count,
          0,
        ),
        breakdown: results.reassigned,
      },
    });
  } catch (error) {
    console.error("Reassign resources error:", error);
    res.status(500).json({ error: "Failed to reassign resources" });
  }
};

Example Workflow:

College Admin tries to deactivate "John Doe" (Teacher)
        ↓
System checks: John owns 5 subjects, 12 timetable slots, 3 classes
        ↓
❌ BLOCKED: "Cannot deactivate - teacher owns 20 resources"
        ↓
Admin opens Resource Reassignment Modal
        ↓
Selects "Jane Smith" as target teacher
        ↓
Checks: Subjects ✓, Timetable ✓, Classes ✓
        ↓
Clicks "Reassign & Continue"
        ↓
✅ Resources reassigned (5 subjects, 12 slots, 3 classes)
        ↓
Now can deactivate John Doe
```

#### 6.5.4 Frontend: Resource Reassignment UI

**New Component: `TeacherResourceReassignmentModal.jsx`**

```jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaArrowRight,
  FaUsers,
} from "react-icons/fa";
import api from "../../../api/axios";
import { toast } from "react-toastify";

export default function TeacherResourceReassignmentModal({
  isOpen,
  onClose,
  teacherId,
  teacherName,
  onReassignmentComplete,
}) {
  const [loading, setLoading] = useState(false);
  const [fetchingResources, setFetchingResources] = useState(true);
  const [resources, setResources] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState([]);
  const [reassigning, setReassigning] = useState(false);

  // Fetch teacher's resources
  useEffect(() => {
    if (isOpen && teacherId) {
      fetchTeacherResources();
      fetchAvailableTeachers();
    }
  }, [isOpen, teacherId]);

  const fetchTeacherResources = async () => {
    try {
      setFetchingResources(true);
      const res = await api.get(`/teachers/${teacherId}/resources`);
      setResources(res.data);

      // Auto-select all resource types that need reassignment
      const types = Object.keys(res.data.resources || {}).filter(
        (key) => res.data.resources[key].requiresReassignment,
      );
      setSelectedResourceTypes(types);
    } catch (error) {
      toast.error("Failed to load teacher resources");
    } finally {
      setFetchingResources(false);
    }
  };

  const fetchAvailableTeachers = async () => {
    try {
      const res = await api.get("/teachers", {
        params: {
          status: "ACTIVE",
          excludeId: teacherId,
          limit: 100,
        },
      });
      setAvailableTeachers(res.data.teachers || []);
    } catch (error) {
      toast.error("Failed to load available teachers");
    }
  };

  const handleReassign = async () => {
    if (!selectedTeacher) {
      toast.error("Please select a teacher to reassign resources to");
      return;
    }

    if (selectedResourceTypes.length === 0) {
      toast.error("Please select at least one resource type to reassign");
      return;
    }

    try {
      setReassigning(true);
      const res = await api.post(`/teachers/${teacherId}/reassign-resources`, {
        toTeacherId: selectedTeacher,
        resourceTypes: selectedResourceTypes,
      });

      toast.success(res.data.message);
      onReassignmentComplete?.();
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to reassign resources",
      );
    } finally {
      setReassigning(false);
    }
  };

  const toggleResourceType = (type) => {
    setSelectedResourceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const selectAllResources = () => {
    const allTypes = Object.keys(resources?.resources || {}).filter(
      (key) => resources.resources[key].requiresReassignment,
    );
    setSelectedResourceTypes(allTypes);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem",
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          style={{
            backgroundColor: "white",
            borderRadius: "20px",
            maxWidth: "800px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1.5rem",
              backgroundColor: "#fef3c7",
              borderBottom: "1px solid #fde68a",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <FaExclamationTriangle
                style={{ color: "#d97706", fontSize: "1.5rem" }}
              />
              <div>
                <h3 style={{ margin: 0, color: "#92400e" }}>
                  Resource Reassignment Required
                </h3>
                <p
                  style={{
                    margin: "0.25rem 0 0 0",
                    color: "#92400e",
                    fontSize: "0.9rem",
                  }}
                >
                  {teacherName} owns resources that must be reassigned
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.25rem",
                cursor: "pointer",
                color: "#92400e",
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "1.5rem", overflow: "auto", flex: 1 }}>
            {fetchingResources ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Loading resources...</p>
              </div>
            ) : resources ? (
              <>
                {/* Resource Summary */}
                <div
                  style={{
                    backgroundColor: "#fef3c7",
                    border: "1px solid #fde68a",
                    borderRadius: "12px",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "#92400e" }}>
                    Resource Ownership Summary
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "0.75rem",
                    }}
                  >
                    {Object.entries(resources.resources).map(([type, data]) => (
                      <div
                        key={type}
                        style={{
                          backgroundColor: "white",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: `2px solid ${
                            data.priority === "CRITICAL"
                              ? "#dc2626"
                              : data.priority === "HIGH"
                                ? "#f59e0b"
                                : "#3b82f6"
                          }`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#6b7280",
                            textTransform: "capitalize",
                          }}
                        >
                          {type.replace(/([A-Z])/g, " $1").trim()}
                        </div>
                        <div
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            color: "#1f2937",
                          }}
                        >
                          {data.count}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            color:
                              data.priority === "CRITICAL"
                                ? "#dc2626"
                                : data.priority === "HIGH"
                                  ? "#f59e0b"
                                  : "#3b82f6",
                          }}
                        >
                          {data.priority}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Select Target Teacher */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    <FaUsers style={{ marginRight: "0.5rem" }} />
                    Reassign Resources To
                  </label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "10px",
                      border: "2px solid #e5e7eb",
                      fontSize: "0.95rem",
                    }}
                  >
                    <option value="">Select a teacher...</option>
                    {availableTeachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name} ({teacher.email}) -{" "}
                        {teacher.department?.name || "No Department"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resource Types Selection */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <label style={{ fontWeight: 600, color: "#374151" }}>
                      Resources to Reassign
                    </label>
                    <button
                      onClick={selectAllResources}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#3b82f6",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Select All
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "0.75rem",
                    }}
                  >
                    {Object.entries(resources.resources).map(([type, data]) => (
                      <label
                        key={type}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.75rem",
                          borderRadius: "10px",
                          border: `2px solid ${
                            selectedResourceTypes.includes(type)
                              ? data.priority === "CRITICAL"
                                ? "#dc2626"
                                : "#3b82f6"
                              : "#e5e7eb"
                          }`,
                          backgroundColor: selectedResourceTypes.includes(type)
                            ? "#f0f9ff"
                            : "white",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedResourceTypes.includes(type)}
                          onChange={() => toggleResourceType(type)}
                          style={{ width: "18px", height: "18px" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#1f2937",
                              textTransform: "capitalize",
                            }}
                          >
                            {type.replace(/([A-Z])/g, " $1").trim()}
                          </div>
                          <div
                            style={{ fontSize: "0.85rem", color: "#6b7280" }}
                          >
                            {data.message}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            backgroundColor:
                              data.priority === "CRITICAL"
                                ? "#fee2e2"
                                : data.priority === "HIGH"
                                  ? "#fef3c7"
                                  : "#dbeafe",
                            color:
                              data.priority === "CRITICAL"
                                ? "#dc2626"
                                : data.priority === "HIGH"
                                  ? "#d97706"
                                  : "#2563eb",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {data.count} items
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "#6b7280",
                }}
              >
                No resources found that need reassignment
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1.5rem",
              backgroundColor: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onClose}
              disabled={reassigning}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                backgroundColor: "white",
                color: "#374151",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleReassign}
              disabled={
                !selectedTeacher ||
                selectedResourceTypes.length === 0 ||
                reassigning
              }
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "10px",
                border: "none",
                backgroundColor:
                  !selectedTeacher || selectedResourceTypes.length === 0
                    ? "#9ca3af"
                    : "#3b82f6",
                color: "white",
                fontWeight: 600,
                cursor:
                  !selectedTeacher || selectedResourceTypes.length === 0
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {reassigning ? (
                <>
                  <span className="spinner-border spinner-border-sm" />
                  Reassigning...
                </>
              ) : (
                <>
                  <FaArrowRight />
                  Reassign & Continue
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
```

#### 6.5.5 Updated Deactivation Flow with Resource Check

**Modified `deactivateUser` Controller Logic:**

```javascript
// Enhanced deactivateUser with resource reassignment support

exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, forceDeactivate } = req.body; // forceDeactivate flag
    const adminId = req.user.id;

    // 1-4. [Previous validation steps remain the same]

    // 5. Check role-specific constraints
    if (user.role === "TEACHER") {
      const teacher = await Teacher.findOne({ user_id: id });
      if (teacher) {
        // Check resource ownership
        const resourceCheck = await checkTeacherResourceOwnership(
          teacher._id,
          req.college_id,
        );

        if (resourceCheck.hasOwnership) {
          // If forceDeactivate is true, auto-reassign to first available teacher
          if (forceDeactivate) {
            // Find another active teacher in same department
            const availableTeacher = await Teacher.findOne({
              college_id: req.college_id,
              status: "ACTIVE",
              _id: { $ne: teacher._id },
              department_id: teacher.department_id,
            });

            if (!availableTeacher) {
              return res.status(400).json({
                error: "NO_AVAILABLE_TEACHER",
                message:
                  "Cannot force deactivate: No other active teacher available in this department to reassign resources.",
                requiresManualReassignment: true,
                resources: resourceCheck.resources,
              });
            }

            // Auto-reassign all resources
            await performBulkReassignment(
              teacher._id,
              availableTeacher._id,
              adminId,
            );

            // Log the auto-reassignment
            await AuditLog.create({
              action: "AUTO_RESOURCE_REASSIGNMENT",
              performedBy: adminId,
              fromTeacher: teacher._id,
              toTeacher: availableTeacher._id,
              reason: "Force deactivation - automatic reassignment",
              timestamp: new Date(),
            });
          } else {
            // Return error with resource details for manual reassignment
            return res.status(400).json({
              error: "CANNOT_DEACTIVATE_TEACHER",
              message: `Cannot deactivate teacher. They own ${resourceCheck.totalResources} active resource(s). Please reassign resources first.`,
              requiresReassignment: true,
              resources: resourceCheck.resources,
              summary: resourceCheck.summary,
              suggestion:
                "Use the resource reassignment UI to transfer ownership before deactivation",
            });
          }
        }
      }
    }

    // 6-9. [Proceed with deactivation - same as before]
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({ error: "Failed to deactivate user" });
  }
};

/**
 * Perform bulk reassignment of all resources
 */
async function performBulkReassignment(fromTeacherId, toTeacherId, adminId) {
  // Reassign all resource types in parallel
  await Promise.all([
    Subject.updateMany(
      { teacher_id: fromTeacherId, isActive: true },
      {
        $set: {
          teacher_id: toTeacherId,
          reassignedAt: new Date(),
          reassignedBy: adminId,
        },
      },
    ),
    TimetableSlot.updateMany(
      { teacher_id: fromTeacherId, isActive: true },
      { $set: { teacher_id: toTeacherId } },
    ),
    AttendanceSession.updateMany(
      { teacher_id: fromTeacherId, status: { $in: ["ACTIVE", "SCHEDULED"] } },
      { $set: { teacher_id: toTeacherId } },
    ),
    Class.updateMany(
      { class_teacher_id: fromTeacherId, isActive: true },
      { $set: { class_teacher_id: toTeacherId } },
    ),
    Course.updateMany(
      { coordinator_id: fromTeacherId, isActive: true },
      { $set: { coordinator_id: toTeacherId } },
    ),
    Assignment.updateMany(
      { created_by: fromTeacherId, status: "ACTIVE" },
      { $set: { created_by: toTeacherId } },
    ),
    ExamSchedule.updateMany(
      {
        invigilator_id: fromTeacherId,
        status: { $in: ["SCHEDULED", "ONGOING"] },
      },
      { $set: { invigilator_id: toTeacherId } },
    ),
  ]);
}
```

#### 6.5.6 Updated Teacher List UI with Resource Check

**Modified `TeachersList.jsx`:**

```jsx
// Add new state and imports
import TeacherResourceReassignmentModal from "../../../components/TeacherResourceReassignmentModal";

const [resourceModal, setResourceModal] = useState({
  isOpen: false,
  teacherId: null,
  teacherName: "",
});

// Updated deactivation handler
const handleDeactivateClick = async (teacher) => {
  try {
    // First check if teacher has resources
    const res = await api.get(`/teachers/${teacher._id}/resources`);

    if (res.data.hasOwnership) {
      // Show resource reassignment modal
      setResourceModal({
        isOpen: true,
        teacherId: teacher._id,
        teacherName: teacher.name,
      });
    } else {
      // No resources, show deactivation modal directly
      setDeactivateModal({
        isOpen: true,
        userId: teacher.user_id,
        userName: teacher.name,
        userRole: "TEACHER",
      });
    }
  } catch (error) {
    toast.error("Failed to check teacher resources");
  }
};

// Handle reassignment completion
const handleReassignmentComplete = () => {
  toast.success(
    "Resources reassigned successfully. You can now deactivate the teacher.",
  );
  setResourceModal({ isOpen: false, teacherId: null, teacherName: "" });
  fetchTeachers(); // Refresh list
};

// Add resource reassignment modal to component
<TeacherResourceReassignmentModal
  isOpen={resourceModal.isOpen}
  onClose={() =>
    setResourceModal({ isOpen: false, teacherId: null, teacherName: "" })
  }
  teacherId={resourceModal.teacherId}
  teacherName={resourceModal.teacherName}
  onReassignmentComplete={handleReassignmentComplete}
/>;
```

#### 6.5.7 Edge Cases & Handling

| Scenario                                      | Handling                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Only one teacher in department**            | Block deactivation, show error: "Cannot deactivate - no other teacher available to reassign resources" |
| **Teacher is HOD**                            | Block deactivation, require HOD reassignment first                                                     |
| **Teacher has ongoing exam duties today**     | Block deactivation with urgent warning                                                                 |
| **Teacher has submitted grades (historical)** | Allow deactivation (historical data preserved)                                                         |
| **Teacher created notifications (past)**      | Allow deactivation (notifications show "Former Teacher")                                               |
| **Multiple teachers available**               | Show selection UI for College Admin to choose reassignment target                                      |
| **Partial reassignment failure**              | Rollback all changes, show detailed error report                                                       |
| **Reassigned teacher later deactivated**      | Chain reassignment to another teacher                                                                  |

#### 6.5.8 Audit Trail for Resource Reassignment

**New Audit Log Entry Structure:**

```javascript
{
  action: "TEACHER_RESOURCES_REASSIGNED",
  performedBy: adminId,
  performedByName: "Admin Name",
  fromTeacher: teacherId,
  fromTeacherName: "John Doe",
  toTeacher: newTeacherId,
  toTeacherName: "Jane Smith",
  reason: "Teacher deactivation - resource reassignment required",
  timestamp: new Date(),
  details: {
    subjects: 5,
    timetableSlots: 12,
    attendanceSessions: 3,
    classTeacherClasses: 2,
    assignments: 8,
    examDuties: 1
  }
}
```

---

### Phase 2: Backend API Endpoints (Days 2-3)

#### 6.5 Create User Controller

**File:** `backend/src/controllers/user.controller.js` (NEW)

```javascript
/**
 * Deactivate a user (Teacher or Student)
 * Only accessible by COLLEGE_ADMIN
 */
exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // 1. Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Validate user belongs to same college
    if (user.college_id.toString() !== req.college_id) {
      return res
        .status(403)
        .json({ error: "Cannot manage users from other colleges" });
    }

    // 3. Prevent self-deactivation
    if (user._id.toString() === adminId) {
      return res
        .status(400)
        .json({ error: "Cannot deactivate your own account" });
    }

    // 4. Check if already deactivated
    if (!user.isActive) {
      return res.status(400).json({ error: "User is already deactivated" });
    }

    // 5. Check role-specific constraints
    if (user.role === "TEACHER") {
      const teacher = await Teacher.findOne({ user_id: id });
      if (teacher) {
        // Check if teacher has pending tasks
        const assignedSubjects = await Subject.countDocuments({
          teacher_id: teacher._id,
        });
        if (assignedSubjects > 0) {
          return res.status(400).json({
            error: `Cannot deactivate: Teacher has ${assignedSubjects} assigned subject(s). Please reassign subjects first.`,
          });
        }
      }
    }

    if (user.role === "STUDENT") {
      const student = await Student.findOne({ user_id: id });
      if (student) {
        // Check for pending payments
        const pendingPayments = await StudentFee.countDocuments({
          student_id: student._id,
          status: "PENDING",
        });
        if (pendingPayments > 0) {
          return res.status(400).json({
            warning: `Student has ${pendingPayments} pending payment(s). Deactivation will block payment access.`,
            allowOverride: true,
          });
        }
      }
    }

    // 6. Update User model
    user.isActive = false;
    user.deactivationReason = reason || "Deactivated by College Admin";
    user.deactivatedAt = new Date();
    user.deactivatedBy = adminId;
    await user.save();

    // 7. Update role-specific model
    if (user.role === "TEACHER") {
      await Teacher.updateOne({ user_id: id }, { status: "INACTIVE" });
    } else if (user.role === "STUDENT") {
      await Student.updateOne({ user_id: id }, { status: "DEACTIVATED" });
    }

    // 8. Invalidate all existing tokens for this user
    await TokenBlacklist.bulkInsert(user._id);

    // 9. Create audit log
    await AuditLog.create({
      action: "USER_DEACTIVATED",
      performedBy: adminId,
      targetUser: id,
      reason: reason,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `User ${user.name} has been deactivated successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: false,
        deactivatedAt: user.deactivatedAt,
      },
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({ error: "Failed to deactivate user" });
  }
};

/**
 * Reactivate a user
 * Only accessible by COLLEGE_ADMIN
 */
exports.reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // 1. Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Validate college
    if (user.college_id.toString() !== req.college_id) {
      return res
        .status(403)
        .json({ error: "Cannot manage users from other colleges" });
    }

    // 3. Check if already active
    if (user.isActive) {
      return res.status(400).json({ error: "User is already active" });
    }

    // 4. Update User model
    user.isActive = true;
    user.deactivationReason = null;
    user.deactivatedAt = null;
    user.deactivatedBy = null;
    await user.save();

    // 5. Update role-specific model
    if (user.role === "TEACHER") {
      await Teacher.updateOne({ user_id: id }, { status: "ACTIVE" });
    } else if (user.role === "STUDENT") {
      await Student.updateOne({ user_id: id }, { status: "APPROVED" });
    }

    // 6. Create audit log
    await AuditLog.create({
      action: "USER_REACTIVATED",
      performedBy: adminId,
      targetUser: id,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `User ${user.name} has been reactivated successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Reactivate user error:", error);
    res.status(500).json({ error: "Failed to reactivate user" });
  }
};

/**
 * Get user status
 * Accessible by COLLEGE_ADMIN and the user themselves
 */
exports.getUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // 1. Find user
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Authorization check
    const isSelf = user._id.toString() === requesterId;
    const isAdmin =
      requesterRole === "COLLEGE_ADMIN" || requesterRole === "SUPER_ADMIN";

    if (!isSelf && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to view user status" });
    }

    // 3. Get role-specific data
    let statusData = {
      user: user,
      isActive: user.isActive,
      deactivationReason: user.isActive ? null : user.deactivationReason,
      deactivatedAt: user.isActive ? null : user.deactivatedAt,
    };

    if (user.role === "TEACHER") {
      const teacher = await Teacher.findOne({ user_id: id });
      statusData.teacherStatus = teacher?.status || "INACTIVE";
    } else if (user.role === "STUDENT") {
      const student = await Student.findOne({ user_id: id });
      statusData.studentStatus = student?.status || "UNKNOWN";
    }

    res.json(statusData);
  } catch (error) {
    console.error("Get user status error:", error);
    res.status(500).json({ error: "Failed to get user status" });
  }
};

/**
 * Bulk deactivate users
 * Only accessible by COLLEGE_ADMIN
 */
exports.bulkDeactivateUsers = async (req, res) => {
  try {
    const { userIds, reason } = req.body;
    const adminId = req.user.id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "Invalid user IDs" });
    }

    // Prevent self-deactivation
    if (userIds.includes(adminId)) {
      return res
        .status(400)
        .json({ error: "Cannot deactivate your own account" });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user || user.college_id.toString() !== req.college_id) {
          results.failed.push({
            userId,
            error: "User not found or not in your college",
          });
          continue;
        }

        if (!user.isActive) {
          results.failed.push({ userId, error: "User is already deactivated" });
          continue;
        }

        // Deactivate
        user.isActive = false;
        user.deactivationReason =
          reason || "Bulk deactivation by College Admin";
        user.deactivatedAt = new Date();
        user.deactivatedBy = adminId;
        await user.save();

        // Update role-specific model
        if (user.role === "TEACHER") {
          await Teacher.updateOne({ user_id: userId }, { status: "INACTIVE" });
        } else if (user.role === "STUDENT") {
          await Student.updateOne(
            { user_id: userId },
            { status: "DEACTIVATED" },
          );
        }

        results.success.push(userId);
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Deactivated ${results.success.length} users, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    console.error("Bulk deactivate error:", error);
    res.status(500).json({ error: "Failed to bulk deactivate users" });
  }
};
```

#### 6.6 Create User Routes

**File:** `backend/src/routes/user.routes.js` (NEW)

```javascript
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const {
  deactivateUser,
  reactivateUser,
  getUserStatus,
  bulkDeactivateUsers,
} = require("../controllers/user.controller");

// All routes require authentication
router.use(authenticate);

// Deactivate user (COLLEGE_ADMIN only)
router.put("/:id/deactivate", requireRole("COLLEGE_ADMIN"), deactivateUser);

// Reactivate user (COLLEGE_ADMIN only)
router.put("/:id/reactivate", requireRole("COLLEGE_ADMIN"), reactivateUser);

// Get user status (COLLEGE_ADMIN or self)
router.get("/:id/status", getUserStatus);

// Bulk deactivate users (COLLEGE_ADMIN only)
router.post(
  "/bulk/deactivate",
  requireRole("COLLEGE_ADMIN"),
  bulkDeactivateUsers,
);

module.exports = router;
```

#### 6.7 Register Routes in Server

**File:** `backend/src/server.js` or `backend/src/app.js`

```javascript
// Add this line where other routes are registered
const userRoutes = require("./routes/user.routes");
app.use("/api/users", userRoutes);
```

---

### Phase 3: Middleware Updates (Day 4)

#### 6.8 Update Auth Middleware

**File:** `backend/src/middlewares/auth.middleware.js`

**Add after JWT verification:**

```javascript
// Check if user is active
if (!user.isActive) {
  return res.status(403).json({
    error: "ACCOUNT_DEACTIVATED",
    message:
      "Your account has been deactivated. Please contact your College Admin.",
    deactivatedAt: user.deactivatedAt,
  });
}
```

#### 6.9 Update Login Controller

**File:** `backend/src/controllers/auth.controller.js`

**Add checks in login function:**

For **Teacher login** (already checks `status: "ACTIVE"`, but add User.isActive check):

```javascript
// After finding teacher
if (!teacher.isActive) {
  // Need to add isActive to Teacher model or check User.isActive
  return res.status(403).json({
    error: "ACCOUNT_DEACTIVATED",
    message:
      "Your account has been deactivated. Please contact your College Admin.",
  });
}
```

For **Student login** (already checks APPROVED status, add DEACTIVATED check):

```javascript
// After finding student
if (student.status === "DEACTIVATED") {
  return res.status(403).json({
    error: "ACCOUNT_DEACTIVATED",
    message:
      "Your account has been deactivated. Please contact your College Admin.",
    reason: student.deactivationReason,
  });
}
```

#### 6.10 Update Token Blacklist

**File:** `backend/src/models/tokenBlacklist.model.js`

**Add bulk insert method:**

```javascript
TokenBlacklistSchema.statics.bulkInsert = async function (userId) {
  // Find all active tokens for this user
  const activeTokens = await this.find({ userId, isBlacklisted: false });

  // Blacklist all of them
  if (activeTokens.length > 0) {
    await this.updateMany(
      { userId, isBlacklisted: false },
      { $set: { isBlacklisted: true, blacklistedAt: new Date() } },
    );
  }
};
```

---

### Phase 4: Frontend Implementation (Days 5-7)

#### 6.11 Create User Status Badge Component

**File:** `frontend/src/components/UserStatusBadge.jsx` (NEW)

```jsx
import { FaCheckCircle, FaTimesCircle, FaBan } from "react-icons/fa";

export default function UserStatusBadge({ isActive, status, role }) {
  const getStatusConfig = () => {
    if (!isActive) {
      return {
        color: "#dc2626",
        bg: "#fee2e2",
        icon: FaBan,
        label: "Deactivated",
        tooltip: "Account deactivated by College Admin",
      };
    }

    if (role === "TEACHER") {
      return status === "ACTIVE"
        ? {
            color: "#16a34a",
            bg: "#dcfce7",
            icon: FaCheckCircle,
            label: "Active",
          }
        : {
            color: "#dc2626",
            bg: "#fee2e2",
            icon: FaTimesCircle,
            label: "Inactive",
          };
    }

    if (role === "STUDENT") {
      const config = {
        APPROVED: {
          color: "#16a34a",
          bg: "#dcfce7",
          icon: FaCheckCircle,
          label: "Approved",
        },
        PENDING: {
          color: "#f59e0b",
          bg: "#fef3c7",
          icon: FaTimesCircle,
          label: "Pending",
        },
        REJECTED: {
          color: "#dc2626",
          bg: "#fee2e2",
          icon: FaTimesCircle,
          label: "Rejected",
        },
        ALUMNI: {
          color: "#64748b",
          bg: "#f1f5f9",
          icon: FaCheckCircle,
          label: "Alumni",
        },
        DEACTIVATED: {
          color: "#dc2626",
          bg: "#fee2e2",
          icon: FaBan,
          label: "Deactivated",
        },
      };
      return config[status] || config.APPROVED;
    }

    return {
      color: "#16a34a",
      bg: "#dcfce7",
      icon: FaCheckCircle,
      label: "Active",
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.375rem 0.75rem",
        borderRadius: "20px",
        backgroundColor: config.bg,
        color: config.color,
        fontSize: "0.8rem",
        fontWeight: 600,
      }}
      title={config.tooltip}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}
```

#### 6.12 Create Deactivation Modal Component

**File:** `frontend/src/components/DeactivateUserModal.jsx` (NEW)

```jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

export default function DeactivateUserModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userRole,
}) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (confirmText !== "DEACTIVATE") return;

    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
    setReason("");
    setConfirmText("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              maxWidth: "500px",
              width: "100%",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.5rem",
                backgroundColor: "#fee2e2",
                borderBottom: "1px solid #fecaca",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <FaExclamationTriangle
                  style={{ color: "#dc2626", fontSize: "1.5rem" }}
                />
                <h3 style={{ margin: 0, color: "#991b1b" }}>Deactivate User</h3>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "#991b1b",
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "1.5rem" }}>
              <p style={{ color: "#4b5563", marginBottom: "1rem" }}>
                You are about to deactivate <strong>{userName}</strong> (
                {userRole}).
              </p>

              <div
                style={{
                  backgroundColor: "#fef3c7",
                  border: "1px solid #fde68a",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <p style={{ margin: 0, color: "#92400e", fontSize: "0.9rem" }}>
                  ⚠️ This user will immediately lose access to:
                </p>
                <ul
                  style={{
                    margin: "0.5rem 0 0 0",
                    paddingLeft: "1.25rem",
                    color: "#92400e",
                    fontSize: "0.85rem",
                  }}
                >
                  <li>Login to the system</li>
                  <li>Dashboard access</li>
                  <li>All features and operations</li>
                </ul>
              </div>

              {/* Reason Field */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Reason for Deactivation (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for deactivation..."
                  rows="3"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "2px solid #e5e7eb",
                    fontSize: "0.95rem",
                    resize: "vertical",
                  }}
                  maxLength="500"
                />
                <small style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                  {reason.length}/500 characters
                </small>
              </div>

              {/* Confirmation */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Type{" "}
                  <code
                    style={{
                      backgroundColor: "#f3f4f6",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                    }}
                  >
                    DEACTIVATE
                  </code>{" "}
                  to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DEACTIVATE"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "2px solid #e5e7eb",
                    fontSize: "0.95rem",
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "1.5rem",
                backgroundColor: "#f9fafb",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmText !== "DEACTIVATE" || loading}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor:
                    confirmText === "DEACTIVATE" ? "#dc2626" : "#9ca3af",
                  color: "white",
                  fontWeight: 600,
                  cursor:
                    confirmText === "DEACTIVATE" && !loading
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {loading ? "Deactivating..." : "Deactivate User"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

#### 6.13 Update Teacher List Page

**File:** `frontend/src/pages/dashboard/College-Admin/TeachersList.jsx`

**Add status toggle:**

```jsx
// Import new components
import UserStatusBadge from "../../../components/UserStatusBadge";
import DeactivateUserModal from "../../../components/DeactivateUserModal";
import api from "../../../api/axios";

// Add state
const [deactivateModal, setDeactivateModal] = useState({
  isOpen: false,
  userId: null,
  userName: "",
  userRole: "TEACHER"
});

// Add handler
const handleDeactivateUser = async (userId, userName, reason) => {
  try {
    await api.put(`/users/${userId}/deactivate`, { reason });
    toast.success(`${userName} has been deactivated`);
    fetchTeachers(); // Refresh list
    setDeactivateModal({ isOpen: false, userId: null, userName: "", userRole: "TEACHER" });
  } catch (error) {
    toast.error(error.response?.data?.error || "Failed to deactivate user");
  }
};

// In table row, add action column:
<td>
  <UserStatusBadge isActive={teacher.isActive} status={teacher.status} role="TEACHER" />
</td>
<td>
  {teacher.isActive && (
    <button
      onClick={() => setDeactivateModal({
        isOpen: true,
        userId: teacher.user_id,
        userName: teacher.name,
        userRole: "TEACHER"
      })}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: "8px",
        border: "none",
        backgroundColor: "#fee2e2",
        color: "#dc2626",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: "0.85rem"
      }}
    >
      Deactivate
    </button>
  )}
  {!teacher.isActive && (
    <button
      onClick={() => handleReactivateUser(teacher.user_id, teacher.name)}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: "8px",
        border: "none",
        backgroundColor: "#dcfce7",
        color: "#16a34a",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: "0.85rem"
      }}
    >
      Reactivate
    </button>
  )}
</td>

// Add modal at bottom of component
<DeactivateUserModal
  isOpen={deactivateModal.isOpen}
  onClose={() => setDeactivateModal({ isOpen: false, userId: null, userName: "", userRole: "TEACHER" })}
  onConfirm={handleDeactivateUser}
  userName={deactivateModal.userName}
  userRole={deactivateModal.userRole}
/>
```

#### 6.14 Update Student List Page

**File:** `frontend/src/pages/dashboard/College-Admin/StudentList.jsx`

Similar changes as Teacher List, but use `DEACTIVATED` status and show different options based on current status.

#### 6.15 Create User Management Dashboard

**File:** `frontend/src/pages/dashboard/College-Admin/UserManagement/UserManagement.jsx` (NEW)

A unified page showing both Teachers and Students with filtering, search, and bulk actions.

---

### Phase 5: Testing & Deployment (Days 8-10)

#### 6.16 Testing Checklist

**Backend Tests:**

- [ ] Deactivate teacher successfully
- [ ] Deactivate student successfully
- [ ] Prevent self-deactivation
- [ ] Prevent deactivating teacher with assigned subjects
- [ ] Handle deactivated user login attempt
- [ ] Handle deactivated user accessing protected routes
- [ ] Reactivate user successfully
- [ ] Bulk deactivate multiple users
- [ ] Verify token invalidation on deactivation
- [ ] Verify audit logs are created

**Frontend Tests:**

- [ ] Deactivation modal shows correctly
- [ ] Confirmation text validation works
- [ ] Status badge displays correctly for all states
- [ ] Deactivate button appears only for active users
- [ ] Reactivate button appears only for deactivated users
- [ ] Success/error toasts display correctly
- [ ] User list refreshes after deactivation/reactivation
- [ ] Bulk selection and bulk deactivation works

**Integration Tests:**

- [ ] Deactivated user cannot login
- [ ] Deactivated user's existing session is terminated
- [ ] Deactivated user sees appropriate error message
- [ ] Reactivated user can login immediately
- [ ] All user data is preserved after deactivation/reactivation
- [ ] Notifications, attendance, fees are not affected

---

## 7. Database Schema Changes Summary

### User Model

```javascript
// NEW FIELDS
isActive: { type: Boolean, default: true, index: true }
deactivationReason: { type: String, default: null, maxlength: 500 }
deactivatedAt: { type: Date, default: null }
deactivatedBy: { type: ObjectId, ref: 'User', default: null }
```

### Student Model

```javascript
// MODIFIED FIELD
status: {
  type: String,
  enum: ["PENDING", "APPROVED", "REJECTED", "DELETED", "ALUMNI", "DEACTIVATED"], // Added DEACTIVATED
  default: "PENDING"
}
```

### Teacher Model

```javascript
// NO CHANGES NEEDED
// Already has: status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" }
```

---

## 8. API Endpoints Summary

| Method | Endpoint                     | Auth | Role                | Description           |
| ------ | ---------------------------- | ---- | ------------------- | --------------------- |
| PUT    | `/api/users/:id/deactivate`  | ✅   | COLLEGE_ADMIN       | Deactivate a user     |
| PUT    | `/api/users/:id/reactivate`  | ✅   | COLLEGE_ADMIN       | Reactivate a user     |
| GET    | `/api/users/:id/status`      | ✅   | COLLEGE_ADMIN, Self | Get user status       |
| POST   | `/api/users/bulk/deactivate` | ✅   | COLLEGE_ADMIN       | Bulk deactivate users |

---

## 9. Frontend Changes Summary

| File                                   | Changes                                  |
| -------------------------------------- | ---------------------------------------- |
| `components/UserStatusBadge.jsx`       | NEW - Display user status                |
| `components/DeactivateUserModal.jsx`   | NEW - Deactivation confirmation modal    |
| `pages/College-Admin/TeachersList.jsx` | Add deactivate/reactivate buttons        |
| `pages/College-Admin/StudentList.jsx`  | Add deactivate/reactivate buttons        |
| `pages/College-Admin/UserManagement/`  | NEW - Unified user management (optional) |

---

## 10. Timeline & Effort Estimation

### Total Estimated Time: **10 Days**

| Phase       | Tasks                                      | Effort         | Duration |
| ----------- | ------------------------------------------ | -------------- | -------- |
| **Phase 1** | Database schema changes + migration script | 1 developer    | 1 day    |
| **Phase 2** | Backend API endpoints + controllers        | 1-2 developers | 2 days   |
| **Phase 3** | Middleware updates + token invalidation    | 1 developer    | 1 day    |
| **Phase 4** | Frontend components + UI updates           | 1-2 developers | 3 days   |
| **Phase 5** | Testing (unit + integration + E2E)         | 1-2 developers | 2 days   |
| **Phase 6** | Bug fixes + deployment + monitoring        | 1 developer    | 1 day    |

### Resource Requirements

- **Backend Developer:** 1 (experienced with Node.js, MongoDB, JWT)
- **Frontend Developer:** 1 (experienced with React, Framer Motion)
- **QA Engineer:** 1 (for comprehensive testing)
- **DevOps:** 1 (for migration script execution and deployment)

---

## 11. Risk Assessment

| Risk                            | Probability | Impact | Mitigation                                                |
| ------------------------------- | ----------- | ------ | --------------------------------------------------------- |
| Data loss during migration      | Low         | High   | Backup database before migration, test on staging first   |
| Breaking existing functionality | Medium      | High   | Comprehensive regression testing, feature flags           |
| Performance impact              | Low         | Medium | Index isActive field, monitor query performance           |
| User confusion                  | Medium      | Low    | Clear UI messaging, email notifications to affected users |
| Accidental deactivation         | Medium      | Medium | Confirmation modal, reason tracking, audit logs           |
| Token invalidation failure      | Low         | High   | Test thoroughly, fallback to token expiry check           |

---

## 12. Rollback Plan

### If Issues Arise Post-Deployment

**Step 1: Feature Toggle**

```javascript
// backend/src/config/featureFlags.js
module.exports = {
  ENABLE_USER_DEACTIVATION: process.env.ENABLE_USER_DEACTIVATION === "true",
};

// Use in routes
if (!featureFlags.ENABLE_USER_DEACTIVATION) {
  return res.status(501).json({ error: "Feature temporarily disabled" });
}
```

**Step 2: Database Rollback**

```javascript
// Rollback migration script
db.users.updateMany(
  { isActive: { $exists: true } },
  {
    $set: {
      isActive: true,
      deactivationReason: null,
      deactivatedAt: null,
      deactivatedBy: null,
    },
  },
);

db.students.updateMany(
  { status: "DEACTIVATED" },
  { $set: { status: "APPROVED" } },
);
```

**Step 3: Code Rollback**

- Revert Git commits related to deactivation feature
- Redeploy previous version
- Monitor for any issues

---

## 13. Success Metrics

After implementation, track these metrics:

| Metric                                | Target       | Measurement            |
| ------------------------------------- | ------------ | ---------------------- |
| Deactivation success rate             | >99%         | API response logs      |
| Average deactivation time             | <500ms       | Performance monitoring |
| User login failure rate (deactivated) | 100% blocked | Auth logs              |
| Reactivation success rate             | >99%         | API response logs      |
| False deactivation reports            | <1%          | User feedback          |
| System uptime                         | >99.9%       | Monitoring tools       |

---

## 14. Conclusion

### ✅ Recommendation: **PROCEED WITH IMPLEMENTATION**

This feature is **critical for proper user lifecycle management** and addresses a significant gap in the current system. The implementation plan is comprehensive, well-tested, and includes proper rollback procedures.

### Key Benefits:

1. ✅ Complete user control for College Admins
2. ✅ Enhanced security with immediate access revocation
3. ✅ Audit trail for compliance
4. ✅ Reversible operations (soft deactivation)
5. ✅ Minimal risk with proper testing

### Next Steps:

1. Review and approve this plan
2. Set up development environment
3. Create feature branch: `feature/user-deactivation`
4. Begin Phase 1 implementation
5. Daily standups to track progress
6. Weekly demos to stakeholders

---

**Prepared By:** Development Team  
**Review Date:** April 3, 2026  
**Target Implementation Start:** Upon Approval  
**Target Completion:** 10 days from start

---

_This document is confidential and intended for internal use only._
