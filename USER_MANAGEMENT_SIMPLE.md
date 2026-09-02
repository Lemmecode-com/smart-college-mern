# User Management Implementation - Role-Based System

## Project: Smart College MERN (NOVAA)
## Document Type: Implementation Documentation
## Approach: Role-Based Access Control (RBAC) - No Permission Model
## Date: April 23, 2026

---

## 1. Introduction

This document outlines the implementation plan for a centralized User Management System using the existing role-based approach. We have decided to:

- NOT implement a separate permission model
- Keep passwords in their current locations (no migration)
- Use Role-Based Access Control (RBAC) as-is
- Only integrate new roles and make them working

The main goals are:
- Centralized user lifecycle management
- Add new operational roles (6 new roles)
- Unified user management dashboard

---

## 2. Where to Start

### 2.1 Prerequisites

Before starting implementation, ensure the following are in place:

1. Full database backup completed
2. Staging environment available for testing
3. Access to constants.js file
4. Access to user.model.js file
5. Understanding of current auth flow in auth.controller.js

### 2.2 Entry Point Files (Foundation Tasks Order)

| Priority | File                                      | Purpose                               |
|----------|-------------------------------------------|---------------------------------------|
| 1        | backend/src/utils/constants.js            | Add all 6 new role constants          |
| 2        | backend/src/models/user.model.js          | Expand role enum to 11 total roles    |
| 3        | backend/src/middlewares/hod.middleware.js | Fix role check from TEACHER to HOD    |
| 4        | backend/src/controllers/auth.controller.js| Unified login flow (already supports) |
| 5        | backend/src/models/parentGuardian.model.js| New ParentGuardian model              |
| 6        | backend/src/middlewares/parent.middleware.js| New middleware for parent scoping    |

---

## 3. Impact Analysis

### 3.1 What Will Change

| Area                    | Impact                                   | Risk Level |
|-------------------------|------------------------------------------|------------|
| User Model Schema       | New roles in enum (11 total)             | Low        |
| Constants               | Add 6 new role constants                 | Low        |
| HOD Middleware          | Change role check from TEACHER to HOD    | Low        |
| Auth Controller         | Already supports dual-check              | None       |
| Student Model           | NO CHANGES - user_id stays as-is         | None       |
| Teacher Model           | NO CHANGES - password stays as-is        | None       |
| ParentGuardian Model    | New model with student_ids array         | Medium     |
| Login Frontend          | Add redirect routes for 6 new roles      | Low        |

### 3.2 Backward Compatibility

Everything remains compatible:
- Student login (uses User model password)
- Teacher login (uses Teacher model password)
- College Admin login (uses User model password)
- Super Admin login (uses User model password)
- All existing roles work as before

### 3.3 New Models Required

| Model                  | Collection Name      | Purpose                                            |
|------------------------|----------------------|----------------------------------------------------|
| ParentGuardian         | parentguardians      | Store parent/guardian data with linked student IDs |

---

## 4. Role Definitions (Complete)

### 4.1 Existing Roles (Keep as-is)

| Role            | Description                     |
|-----------------|---------------------------------|
| SUPER_ADMIN     | System-wide platform management |
| COLLEGE_ADMIN   | Full college management         |
| TEACHER         | Faculty member                  |
| STUDENT         | Enrolled student                |

### 4.2 New Roles to Add (6 Roles)

| Role                | Description                            |
|---------------------|----------------------------------------|
| PRINCIPAL           | Academic head of college (read-only access) |
| ACCOUNTANT          | Manages fees, payments, receipts, financial reports |
| ADMISSION_OFFICER   | Handles student admissions (PENDING applications only) |
| EXAM_COORDINATOR    | Manages examination planning (view students/teachers) |
| PARENT_GUARDIAN     | Views own child's data (attendance, fees, profile) |
| PLATFORM_SUPPORT    | System health, audit logs, college list |

### 4.3 Existing Role Fix: HOD

**HOD (Head of Department)** is an existing role that requires middleware correction and enum addition.

**Change Required:** `backend/src/middlewares/hod.middleware.js` line 10 — change role check from `TEACHER` to `HOD`.

**Note:** HOD is already in `constants.js` but **must be added** to `user.model.js` enum (see Section 6.2). This increases total roles to 11.

```
SUPER_ADMIN
    └── COLLEGE_ADMIN
            ├── PRINCIPAL
            ├── HOD
            │       └── TEACHER
            │               └── STUDENT
            ├── ACCOUNTANT
            ├── ADMISSION_OFFICER
            ├── EXAM_COORDINATOR
            ├── PARENT_GUARDIAN (linked to STUDENT)
            └── PLATFORM_SUPPORT
```

---

## 5. Detailed Role Access Matrix

### 5.1 ACCOUNTANT

**Access Scope:** Fee collection, payment tracking, receipts, financial reports. No academic/student data.

**Backend Routes to Add:**
- `GET /api/accountant/dashboard` - New route (overall stats)
- Allowed from existing routes:
  - Payment routes (GET all, GET by student, POST)
  - Receipt routes (GET all, GET by payment, POST generate)
  - Fee structure routes (GET only)
  - Financial reports routes (GET only)

**Frontend Pages:**
- `AccountantDashboard` - Main dashboard with fee collection stats
- `FeeCollection` - Record payments, view pending fees
- `PaymentHistory` - Search payment history by student/date
- `ReceiptManagement` - Generate and manage receipts

### 5.2 ADMISSION_OFFICER

**Access Scope:** PENDING applications only. No access to enrolled students.

**Backend Routes to Add:**
- `GET /api/admission/dashboard` - New route (pending count, recent apps)
- Use from existing:
  - Registered Students routes (but filter by status === 'PENDING' only)
  - New admission status routes from Phase 2 (update status workflow)

**Frontend Pages:**
- `AdmissionDashboard` - Overview of pending applications
- `PendingApplications` - List all PENDING applications
- `ApplicationDetail` - View details, verify documents, change status

### 5.3 PRINCIPAL

**Access Scope:** Read everything, write nothing (except notifications). View-only access to all academic data.

**Backend Routes to Add:**
- GET access to ALL existing routes across:
  - Student routes (all GET)
  - Teacher routes (all GET)
  - Department routes (all GET)
  - Course routes (all GET)
  - Reports routes (all GET)
  - Dashboard routes (all GET)
  - Attendance routes (all GET)
  - Fee routes (GET only)
  - Audit log routes (GET only)

**Frontend Pages:**
- Read-only versions of all existing pages (no action buttons like Edit/Delete/Create)
- `PrincipalDashboard` - Aggregated view of all college data
- All existing pages modified to hide action buttons when role === PRINCIPAL

### 5.4 EXAM_COORDINATOR

**Access Scope:** View students and teachers for exam planning only. Full exam module is V1.1 (future).

**Backend Routes to Add:**
- `GET /api/exam/dashboard` - New placeholder route returning `{ message: "Exam module coming in V1.1" }`
- Allowed GET from existing:
  - Approved students list (GET /api/students/approved)
  - Teacher list (GET all)
  - Timetable list (GET all)
  - Attendance records (GET for exam planning)

**Frontend Pages:**
- `ExamDashboard` - Placeholder dashboard only
- No exam scheduling UI yet (V1.1)

### 5.5 PARENT_GUARDIAN

**Access Scope:** Own child's attendance, fees, profile. Read-only. Scoped to linked students only.

**New Model Required:**
```javascript
ParentGuardian {
  user_id: ObjectId (ref: User),
  student_ids: [ObjectId] (ref: Student),
  relation: String (father/mother/guardian),
  createdAt: Date
}
```

**Backend Routes to Add (NEW):**
- `GET /api/parent/children` - List all linked students
- `GET /api/parent/student/:studentId/profile` - Child's profile
- `GET /api/parent/student/:studentId/attendance` - Child's attendance records
- `GET /api/parent/student/:studentId/fees` - Child's fee details and payment history
- All routes enforced by middleware that checks student_ids array

**New Middleware Required:**
- `parent.middleware.js` - Attaches `req.linkedStudentIds` from ParentGuardian collection

**Frontend Pages:**
- `ParentDashboard` - Overview of all linked children
- `ChildAttendance` - Attendance view for one child
- `ChildFees` - Fee status and payment history for one child
- `ChildProfile` - Profile details for one child

### 5.6 PLATFORM_SUPPORT

**Access Scope:** College list, system health, audit logs. No academic or financial data access.

**Backend Routes to Add:**
- Use existing:
  - College list GET routes
  - Health check endpoints
  - Audit log GET routes

**Frontend Pages:**
- `PlatformSupportDashboard` - Simple dashboard with system status, college list, recent audit logs

---

## 6. What We Need to Change

### 6.1 Update Constants File (Priority 1)

**File:** `backend/src/utils/constants.js`

Add all 6 new role constants:

```javascript
ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COLLEGE_ADMIN: 'COLLEGE_ADMIN',
  PRINCIPAL: 'PRINCIPAL',
  HOD: 'HOD',
  ACCOUNTANT: 'ACCOUNTANT',
  ADMISSION_OFFICER: 'ADMISSION_OFFICER',
  EXAM_COORDINATOR: 'EXAM_COORDINATOR',
  PARENT_GUARDIAN: 'PARENT_GUARDIAN',
  PLATFORM_SUPPORT: 'PLATFORM_SUPPORT',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT'
}
```

### 6.2 Update User Model (Priority 2)

**File:** `backend/src/models/user.model.js`

Update role enum to include all 11 roles:

```javascript
role: {
  type: String,
  enum: [
    'SUPER_ADMIN',
    'COLLEGE_ADMIN',
    'PRINCIPAL',
    'HOD',
    'ACCOUNTANT',
    'ADMISSION_OFFICER',
    'EXAM_COORDINATOR',
    'PARENT_GUARDIAN',
    'PLATFORM_SUPPORT',
    'TEACHER',
    'STUDENT'
  ],
  required: true
}
```

### 6.3 Fix HOD Middleware (Priority 3)

**File:** `backend/src/middlewares/hod.middleware.js`

**Change:** Role check from `TEACHER` to `HOD`

Current likely code:
```javascript
if (user.role !== 'TEACHER') {
  return next(new AppError('Only HOD can access', 403));
}
```

Fix to:
```javascript
if (user.role !== 'HOD') {
  return next(new AppError('Only HOD can access', 403));
}
```

### 6.4 Create ParentGuardian Model (Priority 5)

**File:** `backend/src/models/parentGuardian.model.js`

Schema:
```javascript
const parentGuardianSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  student_ids: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  relation: { type: String, enum: ['father', 'mother', 'guardian'] },
  createdAt: { type: Date, default: Date.now }
});
```

### 6.5 Create Parent Middleware (Priority 6)

**File:** `backend/src/middlewares/parent.middleware.js`

Attaches linked student IDs to request:

```javascript
export const attachParentStudents = async (req, res, next) => {
  try {
    const parent = await ParentGuardian.findOne({ user_id: req.user._id });
    if (!parent) {
      return next(new AppError('Parent guardian not found', 404));
    }
    req.linkedStudentIds = parent.student_ids;
    next();
  } catch (error) {
    next(error);
  }
};
```

### 6.6 Update Role Middleware (Priority 7)

**File:** `backend/src/middlewares/role.middleware.js`

Add all new roles to allowed roles validation.

### 6.7 Add mustChangePassword Field

**File:** `backend/src/models/user.model.js`

Add field to schema:
```javascript
mustChangePassword: { type: Boolean, default: false }
```

This flag forces staff to change password on first login. Staff creation endpoint sets it to `true`.

### 6.8 Update Login Frontend Routing (Priority 8)

**File:** `frontend/src/pages/auth/Login.jsx`

Add redirect cases for all 6 new roles:

```javascript
switch(userRole) {
  case 'PRINCIPAL':
    navigate('/dashboard/principal');
    break;
  case 'HOD':
    navigate('/dashboard/hod');
    break;
  case 'ACCOUNTANT':
    navigate('/dashboard/accountant');
    break;
  case 'ADMISSION_OFFICER':
    navigate('/dashboard/admission');
    break;
  case 'EXAM_COORDINATOR':
    navigate('/dashboard/exam');
    break;
  case 'PARENT_GUARDIAN':
    navigate('/dashboard/parent');
    break;
  case 'PLATFORM_SUPPORT':
    navigate('/dashboard/support');
    break;
  // existing cases...
}
```

---

## 7. What We Need to Build New

### 7.1 Backend New Components

| Component                     | File Path                                           | Purpose                              |
|-------------------------------|-----------------------------------------------------|--------------------------------------|
| ParentGuardian Model          | backend/src/models/parentGuardian.model.js          | Store parent-student linkage         |
| Parent Middleware             | backend/src/middlewares/parent.middleware.js        | Scope parent requests to their children |
| Accountant Dashboard Route    | backend/src/routes/accountant.routes.js             | Accountant endpoints                 |
| Admission Dashboard Route     | backend/src/routes/admission.routes.js              | Admission officer endpoints          |
| Exam Dashboard Route          | backend/src/routes/exam.routes.js                   | Exam coordinator endpoints           |
| Parent Routes                 | backend/src/routes/parent.routes.js                 | Parent view endpoints                |
| Platform Support Route        | backend/src/routes/platformSupport.routes.js        | System health & audit endpoints      |

### 7.2 Frontend New Pages

| Page                      | File Path                                          | Role            |
|---------------------------|----------------------------------------------------|-----------------|
| PrincipalDashboard        | frontend/src/pages/dashboard/Principal/*           | PRINCIPAL       |
| HodDashboard              | frontend/src/pages/dashboard/HOD/*                 | HOD             |
| AccountantDashboard       | frontend/src/pages/dashboard/Accountant/*          | ACCOUNTANT      |
| FeeCollection             | frontend/src/pages/dashboard/Accountant/FeeCollection.jsx |
| PaymentHistory            | frontend/src/pages/dashboard/Accountant/PaymentHistory.jsx |
| ReceiptManagement         | frontend/src/pages/dashboard/Accountant/ReceiptManagement.jsx |
| AdmissionDashboard        | frontend/src/pages/dashboard/Admission/*           | ADMISSION_OFFICER |
| PendingApplications       | frontend/src/pages/dashboard/Admission/PendingApplications.jsx |
| ApplicationDetail         | frontend/src/pages/dashboard/Admission/ApplicationDetail.jsx |
| ExamDashboard             | frontend/src/pages/dashboard/ExamCoordinator/*     | EXAM_COORDINATOR|
| ParentDashboard           | frontend/src/pages/dashboard/Parent/*              | PARENT_GUARDIAN |
| ChildAttendance           | frontend/src/pages/dashboard/Parent/ChildAttendance.jsx |
| ChildFees                 | frontend/src/pages/dashboard/Parent/ChildFees.jsx |
| ChildProfile              | frontend/src/pages/dashboard/Parent/ChildProfile.jsx |
| PlatformSupportDashboard  | frontend/src/pages/dashboard/PlatformSupport/*     | PLATFORM_SUPPORT|

### 7.3 Staff Account Management Endpoints

**Requirement:** COLLEGE_ADMIN creates staff accounts (ACCOUNTANT, ADMISSION_OFFICER, etc.)

**New Route:** `POST /api/college/staff`

**Controller:** `backend/src/controllers/staff.controller.js`

**Logic:**
1. COLLEGE_ADMIN creates user with role (ACCOUNTANT, ADMISSION_OFFICER, etc.)
2. Generate temporary password
3. Set `mustChangePassword: true`
4. Create User document with password
5. Return credentials ONCE (temp password shown once)
6. Send email with temp password (optional)

**Existing Roles that Can Be Created:**
- ACCOUNTANT
- ADMISSION_OFFICER
- HOD
- PRINCIPAL
- EXAM_COORDINATOR
- LIBRARIAN (if exists)
- RECEPTIONIST (if exists)
- IT_ADMIN (if exists)

**NOT Allowed to Create:**
- SUPER_ADMIN (only existing SUPER_ADMIN can create)
- COLLEGE_ADMIN (only SUPER_ADMIN can create)
- PARENT_GUARDIAN (self-registration or COLLEGE_ADMIN creates)
- TEACHER (existing AddTeacher flow)

---

## 8. Implementation Workflow Diagram

### 8.1 Foundation Phase Flow

```
START
  │
  ▼
[Update constants.js] ───┐
  │                      │
  ▼                      │
[Update user.model.js]   │ ALL 6 new roles
  │                      │ added to constants & enum
  ▼                      │
[Fix HOD middleware] ────┘
  │
  ▼
[Verify auth flow] (already supports dual-check)
  │
  ▼
[Create ParentGuardian model]
  │
  ▼
[Create parent middleware]
  │
  ▼
FOUNDATION COMPLETE ────→ [Staff account management APIs]
                              │
                              ▼
                    [New role-specific routes]
                              │
                              ▼
                    [Frontend login routing]
                              │
                              ▼
                    [Frontend dashboards & pages]
```

### 8.2 Staff Account Creation Flow

```
COLLEGE_ADMIN accesses UI
  │
  ▼
Select Role (ACCOUNTANT/ADMISSION_OFFICER/etc.)
  │
  ▼
Enter user details (email, name)
  │
  ▼
[POST /api/college/staff]
  │
  ▼
Generate random temp password
  │
  ▼
Create User with:
  - role: selectedRole
  - password: hashed(tempPassword)
  - mustChangePassword: true
  - isActive: true
  │
  ▼
Return credentials (ONCE)
  │
  ▼
Display temp password to COLLEGE_ADMIN
  │
  ▼
Send email (optional)
  │
  ▼
Staff member logs in with temp password
  │
  ▼
Redirect to force password change
  │
  ▼
Set new password
  │
  ▼
mustChangePassword = false
  │
  ▼
DASHBOARD ACCESS
```

### 8.3 Parent Guardian Data Flow

```
PARENT_GUARDIAN Account Creation
  │
  ▼
Linked to student(s) via student_ids
  │
  ▼
Parent logs in
  │
  ▼
[Auth middleware identifies role]
  │
  ▼
[parent middleware attaches req.linkedStudentIds]
  │
  ▼
GET /api/parent/children
  │
  ▼
Returns: [{ studentId, name, class, ... }]
  │
  ▼
Parent selects child
  │
  ▼
Access scoped endpoints:
  - /api/parent/student/:id/profile
  - /api/parent/student/:id/attendance
  - /api/parent/student/:id/fees
  │
  ▼
All queries filter by student_ids from ParentGuardian
```

---

## 9. Implementation Steps (Detailed)

### Step 1: Constants Update
1. Open `backend/src/utils/constants.js`
2. Add 6 new role constants to ROLE object
3. Save and commit

### Step 2: User Model Update
1. Open `backend/src/models/user.model.js`
2. Update enum array with all 11 roles (including HOD)
3. Add `mustChangePassword: { type: Boolean, default: false }` field
4. Save and commit

### Step 3: HOD Middleware Fix
1. Open `backend/src/middlewares/hod.middleware.js`
2. Change role check from `TEACHER` to `HOD`
3. Save and commit

### Step 4: ParentGuardian Model
1. Create new file `backend/src/models/parentGuardian.model.js`
2. Define schema with user_id, student_ids, relation
3. Register model in `backend/app.js`
4. Save and commit

### Step 5: Parent Middleware
1. Create new file `backend/src/middlewares/parent.middleware.js`
2. Implement `attachParentStudents` function
3. Register middleware in routes where needed
4. Save and commit

### Step 6: Staff Account Management
1. Create `backend/src/controllers/staff.controller.js`
2. Create `backend/src/routes/staff.routes.js`
3. Implement POST /api/college/staff endpoint
4. Add temp password generation logic
5. Set mustChangePassword flag
6. Return credentials once
7. Save and commit

### Step 7: New Role Routes

Create 6 new route files:

**Accountant:**
- `backend/src/routes/accountant.routes.js`
- `backend/src/controllers/accountant.controller.js`
- GET /api/accountant/dashboard
- Re-use payment, receipt, fee routes with role check

**Admission Officer:**
- `backend/src/routes/admission.routes.js`
- `backend/src/controllers/admission.controller.js`
- GET /api/admission/dashboard
- Filter registeredStudents by status=PENDING

**Exam Coordinator:**
- `backend/src/routes/exam.routes.js`
- `backend/src/controllers/exam.controller.js`
- GET /api/exam/dashboard → `{ message: "Exam module coming in V1.1" }`

**Principal:**
- No new routes needed, only GET access to existing routes
- Update existing route files to allow PRINCIPAL in role middleware

**Platform Support:**
- No new routes needed, use existing college/health/audit routes
- Update role middleware to allow PLATFORM_SUPPORT

### Step 8: Frontend Login Routing
1. Open `frontend/src/pages/auth/Login.jsx`
2. Add 6 new case statements in role-based redirect switch
3. Add corresponding route paths in React Router
4. Save and commit

### Step 9: Frontend Dashboard Pages
Create 14 new page components (plus read-only variants):

1. PrincipalDashboard + 12 read-only pages
2. HodDashboard (new)
3. AccountantDashboard + 3 sub-pages (FeeCollection, PaymentHistory, ReceiptManagement)
4. AdmissionDashboard + 2 sub-pages (PendingApplications, ApplicationDetail)
5. ExamDashboard (placeholder)
6. ParentDashboard + 3 sub-pages (ChildAttendance, ChildFees, ChildProfile)
7. PlatformSupportDashboard

### Step 10: Middleware Updates
Update all route files to include new roles in roleMiddleware:

```javascript
router.use(authMiddleware, roleMiddleware(['PRINCIPAL', 'ACCOUNTANT', ...]));
```

---

## 10. Route Permission Matrix

### 10.1 Accountant Access

| Existing Route                 | Access | Notes                      |
|--------------------------------|--------|----------------------------|
| GET /api/payments              | YES    | All payments               |
| GET /api/payments/:id          | YES    | Single payment             |
| POST /api/payments             | YES    | Create payment             |
| GET /api/receipts              | YES    | All receipts               |
| GET /api/receipts/:id          | YES    | Single receipt             |
| POST /api/receipts             | YES    | Generate receipt           |
| GET /api/feestructure          | YES    | View fee structure         |
| GET /api/financial-reports     | YES    | Financial reports          |
| GET /api/dashboard             | YES    | Dashboard stats            |

### 10.2 Admission Officer Access

| Existing Route                      | Access | Notes                              |
|-------------------------------------|--------|------------------------------------|
| GET /api/students/registered        | YES    | **ONLY status === 'PENDING'**      |
| GET /api/students/:id               | YES    | Only if status is PENDING          |
| PUT /api/students/:id/status        | YES    | Update admission status           |
| GET /api/students/:id/documents     | YES    | View documents                    |
| PUT /api/students/:id/verify-docs   | YES    | Verify documents                  |
| GET /api/admission/dashboard        | YES    | New custom dashboard               |

### 10.3 Principal Access

| Existing Route                 | Access | Notes                    |
|--------------------------------|--------|--------------------------|
| ALL GET routes                 | YES    | Read-only everywhere     |
| POST/PUT/DELETE routes         | NO     | Except notifications     |
| GET /api/students              | YES    | All students             |
| GET /api/teachers              | YES    | All teachers             |
| GET /api/departments           | YES    | All departments          |
| GET /api/courses               | YES    | All courses              |
| GET /api/attendance            | YES    | All attendance records   |
| GET /api/audit-logs            | YES    | All audit logs           |

### 10.4 Exam Coordinator Access

| Existing Route                       | Access | Notes                      |
|--------------------------------------|--------|----------------------------|
| GET /api/students/approved           | YES    | Approved students only     |
| GET /api/teachers                    | YES    | All teachers               |
| GET /api/timetable                   | YES    | All timetable entries      |
| GET /api/attendance                  | YES    | All attendance (for planning) |
| GET /api/exam/dashboard              | YES    | New placeholder route      |
| POST/PUT/DELETE any route            | NO     | Read-only only             |

### 10.5 Parent Guardian Access

| Route                                      | Access | Notes                                  |
|--------------------------------------------|--------|----------------------------------------|
| GET /api/parent/children                   | YES    | List linked students                   |
| GET /api/parent/student/:id/profile       | YES    | Only if student in student_ids         |
| GET /api/parent/student/:id/attendance    | YES    | Scoped to linked student               |
| GET /api/parent/student/:id/fees          | YES    | Scoped to linked student               |
| ANY other student/teacher route            | NO     | Blocked by middleware                  |

### 10.6 Platform Support Access

| Existing Route                 | Access | Notes                    |
|--------------------------------|--------|--------------------------|
| GET /api/colleges              | YES    | All colleges             |
| GET /api/health                | YES    | System health            |
| GET /api/audit-logs            | YES    | All audit logs           |
| Academic routes (students, etc)| NO     | No access                |
| Financial routes              | NO     | No access                |

---

## 11. Login Redirection Mapping

**File:** `frontend/src/pages/auth/Login.jsx`

Add to existing switch case:

```javascript
const ROLE_DASHBOARD_MAP = {
  SUPER_ADMIN: '/dashboard/superadmin',
  COLLEGE_ADMIN: '/dashboard/college-admin',
  PRINCIPAL: '/dashboard/principal',
  HOD: '/dashboard/hod',
  ACCOUNTANT: '/dashboard/accountant',
  ADMISSION_OFFICER: '/dashboard/admission',
  EXAM_COORDINATOR: '/dashboard/exam',
  PARENT_GUARDIAN: '/dashboard/parent',
  PLATFORM_SUPPORT: '/dashboard/support',
  TEACHER: '/dashboard/teacher',
  STUDENT: '/dashboard/student'
};
```

---

## 12. Testing Checklist

### 12.1 Backend Tests

- [ ] User model accepts all 11 role values
- [ ] HOD middleware only allows HOD role
- [ ] Staff creation endpoint generates temp password
- [ ] Parent middleware scopes to linked students only
- [ ] Accountant dashboard returns fee stats
- [ ] Admission dashboard filters PENDING applications
- [ ] Exam dashboard returns placeholder message
- [ ] Principal can access all GET routes
- [ ] Platform support cannot access academic routes

### 12.2 Frontend Tests

- [ ] Login redirects to correct dashboard for each role
- [ ] Accountant pages load without errors
- [ ] Admission pages show only PENDING applications
- [ ] Parent pages show only linked children
- [ ] Principal pages hide action buttons
- [ ] All dashboards render correctly

---

## 13. Rollout Plan

### Day 1-2: Foundation
- Update constants and user model
- Fix HOD middleware
- Create ParentGuardian model and middleware
- Deploy to staging

### Day 3-4: Backend APIs
- Build staff account management endpoint
- Build 6 new role route files
- Test all endpoints with Postman
- Deploy to staging

### Day 5-7: Frontend
- Create 14 new page components
- Update Login.jsx routing
- Test all role dashboards
- Deploy to staging

### Day 8-9: QA and Bug Fixes
- Integration testing
- Permission validation
- Edge case testing
- Final deployment

---

## 14. Quick Reference: Files to Modify

| File/Component                          | Change Type | Lines to Edit |
|-----------------------------------------|-------------|---------------|
| constants.js                            | MODIFY      | Add 6 roles   |
| user.model.js                           | MODIFY      | Enum update   |
| hod.middleware.js                       | MODIFY      | 1 line        |
| parentGuardian.model.js                 | NEW         | 25 lines      |
| parent.middleware.js                    | NEW         | 20 lines      |
| staff.controller.js                     | NEW         | 60 lines      |
| staff.routes.js                         | NEW         | 15 lines      |
| accountant.routes.js                    | NEW         | 10 lines      |
| accountant.controller.js                | NEW         | 30 lines      |
| admission.routes.js                     | NEW         | 10 lines      |
| admission.controller.js                 | NEW         | 30 lines      |
| exam.routes.js                          | NEW         | 5 lines       |
| exam.controller.js                      | NEW         | 10 lines      |
| platformSupport.routes.js               | NEW         | 5 lines       |
| platformSupport.controller.js           | NEW         | 10 lines      |
| Login.jsx                               | MODIFY      | Add 6 cases   |
| 14 Frontend page components             | NEW         | ~14 × 80 lines|

**Total Estimated New Code:** ~1,500 lines (backend + frontend)
**Total Modified Files:** 3 files
**Total New Files:** ~20 files

---

## 15. Summary

This implementation adds **6 new operational roles** to the Smart College system:

1. **ACCOUNTANT** - Fee and payment management
2. **ADMISSION_OFFICER** - Application processing (PENDING only)
3. **PRINCIPAL** - Read-only access to all data
4. **EXAM_COORDINATOR** - Exam planning (view-only)
5. **PARENT_GUARDIAN** - Scoped access to own child's data
6. **PLATFORM_SUPPORT** - System health and audit logs

**Start with:** Step 1-3 (constants, user model, HOD middleware fix)

Then proceed in order through Steps 4-15 as outlined above.

---

End of Document
