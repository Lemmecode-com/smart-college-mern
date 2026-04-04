# 📘 User Deactivation Feature - Business Plan (Non-Technical)

**Document Version:** 1.0  
**Date:** April 3, 2026  
**Audience:** Managers, Stakeholders, Product Owners  
**Purpose:** Easy-to-understand overview without technical complexity

---

## 📋 Table of Contents

1. [What Are We Building?](#1-what-are-we-building)
2. [Why Do We Need This?](#2-why-do-we-need-this)
3. [Current System vs. New System](#3-current-system-vs-new-system)
4. [How It Works - Simple Workflow](#4-how-it-works---simple-workflow)
5. [Key Rules & Restrictions](#5-key-rules--restrictions)
6. [Resource Ownership Problem](#6-resource-ownership-problem)
7. [Pros & Cons](#7-pros--cons)
8. [Implementation Timeline](#8-implementation-timeline)
9. [Risks & Solutions](#9-risks--solutions)
10. [What Users Will See](#10-what-users-will-see)

---

## 1. What Are We Building?

A **user account management feature** that allows **College Administrators** to:

| Action | What It Does |
|--------|--------------|
| **Deactivate** | Temporarily disable a Teacher or Student account |
| **Reactivate** | Re-enable a previously deactivated account |
| **Track Reason** | Record why an account was deactivated |
| **Reassign Resources** | Transfer ownership of subjects, classes, etc. to another teacher |

**Important:** Deactivation is NOT deletion. All data (grades, attendance, payments) is preserved and can be restored by reactivating the account.

---

## 2. Why Do We Need This?

### Current Problems

| Problem | Impact |
|---------|--------|
| No way to temporarily disable a user | College Admins have no control over problematic accounts |
| Cannot block access without deleting | Deleting removes all data permanently |
| Teacher leaves but still has access | Security risk - former employees can still log in |
| Student misbehaves but account stays active | No disciplinary action mechanism |
| No audit trail of account changes | Cannot track who disabled whom and when |

### Benefits After Implementation

| Benefit | Value |
|---------|-------|
| ✅ Complete user lifecycle control | College Admins can manage users from admission to exit |
| ✅ Enhanced security | Deactivated users immediately lose all access |
| ✅ Data preservation | All historical records remain intact |
| ✅ Compliance ready | Meets institutional requirements for account management |
| ✅ Audit trail | Full tracking of who deactivated whom, when, and why |
| ✅ Reversible | Accounts can be reactivated anytime without data loss |

---

## 3. Current System vs. New System

### Before Implementation

```
┌─────────────────────────────────────────────┐
│           CURRENT STATE                     │
├─────────────────────────────────────────────┤
│                                             │
│  Student Lifecycle:                         │
│  Register → Pending → Approved → Alumni     │
│                 ↓                           │
│              Rejected (blocked)             │
│                                             │
│  Teacher Lifecycle:                         │
│  Created → Active (forever)                 │
│                                             │
│  ❌ NO deactivation option                  │
│  ❌ NO temporary suspension                 │
│  ❌ NO resource reassignment                │
│  ❌ NO audit trail                          │
│                                             │
└─────────────────────────────────────────────┘
```

### After Implementation

```
┌─────────────────────────────────────────────┐
│           NEW STATE                         │
├─────────────────────────────────────────────┤
│                                             │
│  Student Lifecycle:                         │
│  Register → Pending → Approved → Alumni     │
│                 ↓                           │
│         ┌────────────┐                     │
│         │ DEACTIVATED│ ← College Admin     │
│         │ (blocked)  │    action           │
│         └─────┬──────┘                     │
│               ↓ Reactivate                 │
│          Approved (restored)               │
│                                             │
│  Teacher Lifecycle:                         │
│  Created → Active → INACTIVE                │
│                  ↓                          │
│         ┌────────────┐                     │
│         │ DEACTIVATED│ ← College Admin     │
│         │ (blocked)  │    action           │
│         └─────┬──────┘                     │
│               ↓ Reactivate                 │
│            Active (restored)               │
│                                             │
│  ✅ Full control                            │
│  ✅ Resource reassignment                   │
│  ✅ Complete audit trail                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 4. How It Works - Simple Workflow

### Deactivation Workflow

```
STEP 1: College Admin clicks "Deactivate" on a user
    ↓
STEP 2: System checks if user owns any resources
    ↓
    ├─ NO resources owned
    │     ↓
    │  STEP 3a: Show confirmation modal
    │     ↓
    │  STEP 4a: Admin types "DEACTIVATE" to confirm
    │     ↓
    │  STEP 5a: User is deactivated immediately
    │     ↓
    │  RESULT: User cannot log in, sees error message
    │
    └─ YES, owns resources (for teachers only)
          ↓
       STEP 3b: Block deactivation, show resource list
          ↓
       STEP 4b: Admin must reassign resources first
          ↓
       STEP 5b: Select another teacher to receive resources
          ↓
       STEP 6b: Resources are transferred
          ↓
       STEP 7b: Now admin can deactivate the teacher
          ↓
       RESULT: Teacher deactivated, all resources reassigned
```

### Reactivation Workflow

```
STEP 1: College Admin clicks "Reactivate" on deactivated user
    ↓
STEP 2: System verifies user is actually deactivated
    ↓
STEP 3: Admin confirms reactivation
    ↓
STEP 4: User account is restored immediately
    ↓
STEP 5: User can log in again
    ↓
RESULT: All data preserved, user back to normal
```

### Login Attempt by Deactivated User

```
Deactivated user tries to log in
    ↓
System checks account status
    ↓
Status = DEACTIVATED
    ↓
BLOCKED with message:
"Your account has been deactivated.
 Please contact your College Admin."
    ↓
User shown deactivation reason (if provided)
    ↓
User cannot access ANY feature until reactivated
```

---

## 5. Key Rules & Restrictions

### Rules for Deactivation

| Rule | Description |
|------|-------------|
| **Rule 1** | College Admin CANNOT deactivate their own account |
| **Rule 2** | College Admin CANNOT deactivate users from other colleges |
| **Rule 3** | Teacher CANNOT be deactivated if they own active resources (subjects, classes, etc.) |
| **Rule 4** | Student CAN be deactivated anytime (no resource ownership) |
| **Rule 5** | Deactivation requires confirmation by typing "DEACTIVATE" |
| **Rule 6** | Deactivation reason is optional but recommended |
| **Rule 7** | All existing login sessions are immediately invalidated |
| **Rule 8** | Historical data (grades, attendance, payments) is NEVER deleted |

### Rules for Reactivation

| Rule | Description |
|------|-------------|
| **Rule 1** | Only College Admin can reactivate users |
| **Rule 2** | Reactivation is instant - no approval needed |
| **Rule 3** | User can log in immediately after reactivation |
| **Rule 4** | All previous data and permissions are restored |
| **Rule 5** | Reactivation is logged in audit trail |

---

## 6. Resource Ownership Problem

### The Problem

When a teacher is deactivated, they may own important resources that cannot be left unassigned:

| Resource Type | Why It Matters | What Happens if Not Reassigned |
|---------------|----------------|-------------------------------|
| **Subjects** | Teacher teaches specific subjects | Students have no teacher for that subject |
| **Timetable Slots** | Teacher has scheduled classes | Timetable shows deactivated teacher |
| **Class Teacher Role** | Teacher manages a class | Class has no class teacher |
| **Attendance Sessions** | Teacher marks attendance | Attendance cannot be marked |
| **Assignments** | Teacher creates assignments | Students cannot submit work |
| **Course Coordinator** | Teacher coordinates courses | Course has no coordinator |
| **Exam Invigilation** | Teacher supervises exams | Exams have no invigilator |

### The Solution

**Before deactivation, College Admin must:**

1. View all resources owned by the teacher
2. Select another active teacher to receive those resources
3. Confirm the reassignment
4. Then proceed with deactivation

### Reassignment Priority Levels

| Priority | Resource Types | Action Required |
|----------|----------------|-----------------|
| 🔴 **CRITICAL** | Subjects, Class Teacher Roles, Exam Duties | MUST reassign before deactivation |
| 🟠 **HIGH** | Timetable Slots, Attendance Sessions, Course Coordinator | Should reassign, strong warning if not |
| 🟡 **MEDIUM** | Assignments | Recommended to reassign |
| 🟢 **LOW** | Past notifications, historical records | No action needed (preserved) |

### Reassignment Workflow Diagram

```
Teacher A owns: 5 subjects, 12 timetable slots, 3 classes
                    ↓
        College Admin clicks "Deactivate"
                    ↓
        ❌ BLOCKED: "Teacher owns 20 resources"
                    ↓
        System shows Resource Reassignment Modal:
        ┌─────────────────────────────────────┐
        │  Resources to Reassign              │
        │  ☑ Subjects (5)         [CRITICAL]  │
        │  ☑ Timetable Slots (12) [HIGH]      │
        │  ☑ Classes (3)          [CRITICAL]  │
        │                                     │
        │  Reassign to: [Select Teacher ▼]    │
        │  Options:                           │
        │    - Teacher B (Math Dept)          │
        │    - Teacher C (Science Dept)       │
        │    - Teacher D (Commerce Dept)      │
        └─────────────────────────────────────┘
                    ↓
        Admin selects Teacher B
                    ↓
        Admin clicks "Reassign & Continue"
                    ↓
        ✅ Resources transferred to Teacher B:
           - 5 subjects → Teacher B
           - 12 timetable slots → Teacher B
           - 3 classes → Teacher B
                    ↓
        Now Teacher A can be deactivated
                    ↓
        Teacher A → DEACTIVATED
        Teacher B → Now owns all resources
```

### Special Cases

| Scenario | How It's Handled |
|----------|------------------|
| **Only one teacher in department** | Block deactivation - no one to reassign to |
| **Teacher is Head of Department (HOD)** | Must appoint new HOD first |
| **Teacher has exam duty TODAY** | Urgent warning, block until reassigned |
| **Multiple teachers available** | Admin chooses who receives resources |
| **Reassignment fails midway** | All changes rolled back, error shown |

---

## 7. Pros & Cons

### Advantages

| # | Benefit | Business Value |
|---|---------|----------------|
| 1 | **Complete user control** | College Admins can manage entire user lifecycle |
| 2 | **Enhanced security** | Deactivated users immediately lose all access |
| 3 | **Audit trail** | Track who deactivated whom, when, and why |
| 4 | **Data preservation** | All historical data remains intact |
| 5 | **Reversible** | Accounts can be reactivated anytime |
| 6 | **Compliance ready** | Meets institutional requirements |
| 7 | **Session invalidation** | Active sessions terminated immediately |
| 8 | **Resource protection** | Subjects, classes, etc. never left unassigned |

### Disadvantages & Risks

| # | Risk | How We Mitigate It |
|---|------|-------------------|
| 1 | **Accidental deactivation** | Confirmation modal + type "DEACTIVATE" + reason field |
| 2 | **Broken resource references** | Mandatory reassignment before deactivation |
| 3 | **Only one teacher in department** | Block deactivation with clear error message |
| 4 | **User confusion** | Clear error messages explaining deactivation |
| 5 | **Pending payments blocked** | Show warning, allow override if needed |
| 6 | **Testing complexity** | Comprehensive testing across all user flows |

---

## 8. Implementation Timeline

### Total Duration: **10 Working Days**

| Phase | Duration | What Happens | Deliverables |
|-------|----------|--------------|--------------|
| **Phase 1: Database Setup** | 1 day | Add new fields to database | Updated user, student, teacher models |
| **Phase 2: Backend Development** | 2 days | Create API endpoints | Deactivate, reactivate, reassign APIs |
| **Phase 3: Security Updates** | 1 day | Update login and middleware | Block deactivated users at login |
| **Phase 4: Frontend Development** | 3 days | Build user interface | Status badges, modals, list updates |
| **Phase 5: Testing** | 2 days | Test all scenarios | Test reports, bug fixes |
| **Phase 6: Deployment** | 1 day | Deploy to production | Live feature, monitoring |

### Resource Requirements

| Role | Quantity | Responsibility |
|------|----------|----------------|
| Backend Developer | 1 | APIs, database, security |
| Frontend Developer | 1 | UI components, user experience |
| QA Engineer | 1 | Testing, bug reporting |
| DevOps | 1 | Deployment, migration |
| Product Manager | 1 | Oversight, stakeholder communication |

---

## 9. Risks & Solutions

### Risk Assessment Matrix

| Risk | Likelihood | Impact | Overall Risk | Solution |
|------|------------|--------|--------------|----------|
| Accidental deactivation | Medium | High | **Medium** | Confirmation modal, reason tracking, audit logs |
| Resource references broken | Low | High | **Medium** | Mandatory reassignment before deactivation |
| Performance impact | Low | Medium | **Low** | Database indexing, performance monitoring |
| User confusion | Medium | Low | **Low** | Clear messaging, email notifications |
| Data loss during migration | Low | High | **Medium** | Backup before migration, test on staging first |
| Only one teacher in department | Medium | Medium | **Medium** | Block deactivation, clear error message |

### Rollback Plan

If issues arise after deployment:

```
STEP 1: Disable feature using environment flag
    ↓
STEP 2: Revert database changes using rollback script
    ↓
STEP 3: Redeploy previous version
    ↓
STEP 4: Monitor for issues
    ↓
STEP 5: Fix issues and redeploy
```

---

## 10. What Users Will See

### College Admin View

**Teacher List Page:**

| Teacher Name | Department | Status | Action |
|--------------|------------|--------|--------|
| John Doe | Mathematics | 🟢 Active | [Deactivate] |
| Jane Smith | Science | 🔴 Deactivated | [Reactivate] |
| Bob Wilson | Commerce | 🟢 Active | [Deactivate] |

**Deactivation Confirmation Modal:**

```
┌─────────────────────────────────────────────┐
│  ⚠️  DEACTIVATE USER                        │
│                                             │
│  You are about to deactivate:               │
│  John Doe (Mathematics Teacher)             │
│                                             │
│  This user will immediately lose access to: │
│  • Login to the system                      │
│  • Dashboard access                         │
│  • All features and operations              │
│                                             │
│  Reason for Deactivation (Optional):        │
│  ┌───────────────────────────────────────┐  │
│  │ Employee left the organization        │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Type DEACTIVATE to confirm:                │
│  ┌───────────────────────────────────────┐  │
│  │ DEACTIVATE                            │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [Cancel]              [Deactivate User]    │
└─────────────────────────────────────────────┘
```

**Resource Reassignment Modal (for teachers):**

```
┌─────────────────────────────────────────────┐
│  ⚠️  RESOURCE REASSIGNMENT REQUIRED         │
│                                             │
│  John Doe owns resources that must be       │
│  reassigned before deactivation:            │
│                                             │
│  Resource Summary:                          │
│  ┌─────────────┬───────┬──────────┐        │
│  │ Subject     │ Count │ Priority │        │
│  ├─────────────┼───────┼──────────┤        │
│  │ Subjects    │   5   │  CRITICAL│        │
│  │ Timetable   │  12   │   HIGH   │        │
│  │ Classes     │   3   │  CRITICAL│        │
│  └─────────────┴───────┴──────────        │
│                                             │
│  Reassign Resources To:                     │
│  [Select Teacher ▼]                         │
│    - Jane Smith (Mathematics)               │
│    - Sarah Johnson (Science)                │
│    - Mike Brown (Mathematics)               │
│                                             │
│  Resources to Reassign:                     │
│  ☑ Subjects (5 items)                       │
│  ☑ Timetable Slots (12 items)               │
│  ☑ Classes (3 items)                        │
│                                             │
│  [Cancel]        [Reassign & Continue]      │
└─────────────────────────────────────────────┘
```

### Teacher/Student View (When Deactivated)

**Login Screen:**

```
┌─────────────────────────────────────────────┐
│                                             │
│         LOGIN TO SMART COLLEGE              │
│                                             │
│  Email:    [john.doe@college.com]           │
│  Password: [••••••••••••]                   │
│                                             │
│  [Login]                                    │
│                                             │
│  ❌ ACCOUNT DEACTIVATED                     │
│                                             │
│  Your account has been deactivated.         │
│  Reason: Employee left the organization     │
│                                             │
│  Please contact your College Admin          │
│  for assistance.                            │
│                                             │
└─────────────────────────────────────────────┘
```

### Status Badges

| Status | Badge Appearance |
|--------|-----------------|
| Active | 🟢 Active (Green) |
| Deactivated | 🔴 Deactivated (Red) |
| Pending (Student) | 🟡 Pending (Yellow) |
| Rejected (Student) | 🔴 Rejected (Red) |
| Alumni (Student) | ⚪ Alumni (Gray) |

---

## 📊 Summary

### What We're Building
A user deactivation/reactivation system for College Admins to manage teacher and student accounts.

### Key Features
- ✅ Deactivate/Reactivate users
- ✅ Resource reassignment for teachers
- ✅ Audit trail tracking
- ✅ Session invalidation
- ✅ Data preservation

### Timeline
**10 working days** from start to deployment

### Resources Needed
- 1 Backend Developer
- 1 Frontend Developer
- 1 QA Engineer
- 1 DevOps Engineer

### Success Metrics
- 100% of deactivated users blocked from login
- 0 data loss during deactivation/reactivation
- <500ms average deactivation time
- >99% reactivation success rate

---

**Prepared By:** Development Team  
**Date:** April 3, 2026  
**Status:** Ready for Review & Approval

---

*This document is confidential and intended for internal stakeholders only.*
