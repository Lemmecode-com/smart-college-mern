# User Management Implementation - Role-Based System

## Project: Smart College MERN (NOVAA)
## Document Type: Implementation Documentation
## Approach: Role-Based Access Control (RBAC) - No Permission Model
## Date: April 21, 2026

---

## 1. Introduction

This document outlines the implementation plan for a centralized User Management System using the existing role-based approach. We have decided to:

- NOT implement a separate permission model
- Keep passwords in their current locations (no migration)
- Use Role-Based Access Control (RBAC) as-is
- Only integrate new roles and make them working

The main goals are:
- Centralized user lifecycle management
- Add new operational roles
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

### 2.2 Entry Point Files

| Priority |  File                                      | Purpose               |
|----------|--------------------------------------------|-----------------------|
| 1        | backend/src/utils/constants.js             | Add new roles         |
| 2        | backend/src/models/user.model.js           | Expand role enum      |
| 3        | backend/src/controllers/auth.controller.js | Unified login flow    |
| 4        | backend/src/models/student.model.js        | Make user_id required |

---

## 3. Impact Analysis

### 3.1 What Will Change

| Area              | Impact                                 | Risk Level |
|-------------------|----------------------------------------|------------|
| User Model Schema | New roles in enum                      | Low        |
| Student Model     | user_id becomes required               | Low        |
| Authentication    | Unified login flow (dual-check)        | Low        |
| Role Middleware   | Support new roles                      | Low        |
| Teacher Model     | NO CHANGES - keep password where it is | None       |

### 3.2 Why No Migration

The current password storage works fine and will continue to work:

- Students: Password in User model
- Teachers: Password in Teacher model

Login flow will check in this order:
1. First, try to find user in User collection by email
2. If found and User has password, verify against User.password
3. If NOT found in User (or User has no password), check Teacher collection
4. If found in Teacher, verify against Teacher.password

This dual-check approach keeps things simple with zero migration risk.

### 3.3 Backward Compatibility

Everything remains compatible:

- Student login (uses User model password)
- Teacher login (uses Teacher model password)
- College Admin login (uses User model password)
- Super Admin login (uses User model password)

### 3.4 Operational Impact

| Timeline | Impact                             |
|----------|------------------------------------|
| Phase 1  | Backend changes, no data migration |
| Phase 2  | Backend APIs, no user impact       |
| Phase 3  | Frontend UI, no user impact        |
| Phase 4  | Testing                            |

---

## 4. What We Need to Change

### 4.1 Update User Model

File: backend/src/models/user.model.js

Changes Required:
- Expand role enum from current 4 roles to 9 roles

Current Roles: SUPER_ADMIN, COLLEGE_ADMIN, TEACHER, STUDENT

New Roles to Add: PRINCIPAL, HOD, ACCOUNTANT, ADMISSION_OFFICER, EXAM_COORDINATOR

### 4.2 Update Constants File

File: backend/src/utils/constants.js

Changes Required:
- Add all new roles to the ROLE object
- Keep existing roles intact

### 4.3 Update Auth Controller

File: backend/src/controllers/auth.controller.js

Changes Required:
- Unified login flow that checks both User and Teacher collections
- First check User model for password
- If User not found or no password, check Teacher model
- Handle account status checks (isActive)
- Return user data with role information

Note: Current auth flow may already support this - verify and refine if needed.

### 4.4 Update Student Model

File: backend/src/models/student.model.js

Changes Required:
- Currently user_id has sparse: true
- Make user_id explicitly required (remove sparse)
- Keep all academic fields

### 4.5 Update Role Middleware

File: backend/src/middlewares/role.middleware.js

Changes Required:
- Update role validation to support new roles
- Ensure HOD and PRINCIPAL roles work correctly

---

## 5. What We Need to Build New

### 5.1 Backend New Components

| Component                  | Purpose                               |
|----------------------------|---------------------------------------|
| User Management Controller | Centralized CRUD for all users        |
| User Management Routes     | New API endpoints for user management |

### 5.2 Frontend New Components

| Component                 | Purpose                         |
|---------------------------|---------------------------------|
| User Management Dashboard | Centralized view of all users   |
| User List Page            | Filterable table with all users |
| Create User Page          | Form to create new users        |
| Edit User Page            | Form to edit user details       |
| Operational Role Pages    | Individual pages for new roles  |

### 5.3 API Endpoints to Create

| Method | Endpoint                   | Purpose          |
|--------|----------------------------|------------------|
| GET    | /api/users                 | List all users   |
| GET    | /api/users/:id             | Get user details |
| PUT    | /api/users/:id             | Update user      |
| PUT    | /api/users/:id/deactivate  | Deactivate user  |
| PUT    | /api/users/:id/reactivate  | Reactivate user  |
| POST   | /api/users/bulk-deactivate | Bulk deactivate  |
| POST   | /api/users/bulk-reactivate | Bulk reactivate  |

---

## 6. Role Definitions

### 6.1 Existing Roles (Keep as-is)

| Role          | Description                     |
|---------------|---------------------------------|
| SUPER_ADMIN   | System-wide platform management |
| COLLEGE_ADMIN | Full college management         |
| TEACHER       | Faculty member                  |
| STUDENT       | Enrolled student                |

### 6.2 New Roles to Add

| Role              | Description                |
|-------------------|----------------------------|
| PRINCIPAL         | Academic head of college   |
| VICE_PRINCIPAL    | Deputy academic head       |
| HOD               | Head of department         |
| ACCOUNTANT        | Manages fees and payments  |
| ADMISSION_OFFICER | Handles student admissions |
| EXAM_COORDINATOR  | Manages examinations       |

### 6.3 Role Hierarchy

```
SUPER_ADMIN
    └── COLLEGE_ADMIN
            ├── PRINCIPAL
            │       └── VICE_PRINCIPAL
            │               ├── HOD
            │               │       └── TEACHER
            │               │               └── STUDENT
            │               └── (OPERATIONAL ROLES)
            ├── ACCOUNTANT
            ├── ADMISSION_OFFICER
            ├── EXAM_COORDINATOR
            ├── LIBRARIAN
            ├── RECEPTIONIST
            └── IT_ADMIN
```

### 6.4 What Each New Role Can Do

| Role              | Access                                       |
|-------------------|----------------------------------------------|
| PRINCIPAL         | View all departments, reports, approve staff |
| VICE_PRINCIPAL    | Assist principal, department oversight       |
| HOD               | Manage own department, timetable approval    |
| ACCOUNTANT        | Fee management, payment reports, receipts    |
| ADMISSION_OFFICER | Student applications, document verification  |
| EXAM_COORDINATOR  | Exam scheduling, hall tickets, results       |
| LIBRARIAN         | Book inventory, issue/return                 |
| RECEPTIONIST      | Visitor log, inquiry handling                |
| IT_ADMIN          | System settings, configuration               |

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)

Tasks:
1. Update constants.js with new roles
2. Update user.model.js with expanded enum
3. Verify auth controller works (dual-check already in place)
4. Update role.middleware.js

Deliverables:
- User model supports all 12 roles
- Unified login working

### Phase 2: Backend APIs (Week 3)

Tasks:
1. Create user management controller
2. Create user management routes

Deliverables:
- User CRUD APIs working

### Phase 3: Frontend UI (Week 4-5)

Tasks:
1. Create user management dashboard
2. Create user list page
3. Create create/edit user forms
4. Add user management to navigation
5. Create operational role pages

Deliverables:
- User management UI working

### Phase 4: Testing (Week 6)

Tasks:
1. Integration testing
2. Bug fixes

Deliverables:
- All features working

---

## 8. Success Criteria

| Metric                         | Target |
|--------------------------------|--------|
| User management time reduction | 60-70% |
| Login success rate             | >99.5% |
| New role onboarding time       | <1 day |

---

## 9. Risk Mitigation

### Risk 1: Login Issues

Mitigation:
- Test on staging first
- Dual-check already supports both User and Teacher

### Risk 2: Performance Issues

Mitigation:
- Proper indexing on User model
- Test on staging

---

End of Document