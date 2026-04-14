# User Management System - Prioritized Implementation Plan

**Project:** Smart College MERN (NOVAA)  
**Document Type:** Phased Implementation Strategy (Priority-Based)  
**Prepared For:** Management Review  
**Date:** April 9, 2026  
**Version:** 1.0  
**Focus:** Priority Roles Only (Accountant, Exam Department, Admission Department, Principal)

---

## Executive Summary
  
This document outlines a **priority-based, streamlined implementation plan** for the User Management System, focusing on the most critical operational roles needed **right now**:

### **Priority Roles (In Order):**
1. **ACCOUNTANT** - Fee management, payment collection, financial reports
2. **EXAM_COORDINATOR** - Exam scheduling, results, hall tickets
3. **ADMISSION_OFFICER** - Student intake, application processing, approvals
4. **PRINCIPAL** - Academic oversight (Vice Principal uses same portal)

### **Key Decisions:**
- ✅ **Vice Principal role ELIMINATED** - Uses Principal portal with delegated permissions
- ✅ **Deferred roles** - Librarian, Receptionist, IT Admin (future phases)
- ✅ **Focus on existing workflows** - Students and Teachers continue working without changes initially
- ✅ **Backward compatible** - Zero disruption to current users

### **Timeline:** 10-12 Weeks (vs. 18 weeks for full plan)

---

## Table of Contents

1. [Priority Role Definitions](#1-priority-role-definitions)
2. [Vice Principal Decision Rationale](#2-vice-principal-decision-rationale)
3. [Implementation Phases (Priority-Based)](#3-implementation-phases-priority-based)
4. [Accountant Role - Detailed Workflow](#4-accountant-role---detailed-workflow)
5. [Exam Coordinator Role - Detailed Workflow](#5-exam-coordinator-role---detailed-workflow)
6. [Admission Officer Role - Detailed Workflow](#6-admission-officer-role---detailed-workflow)
7. [Principal Role - Enhanced Workflow](#7-principal-role---enhanced-workflow)
8. [Data Model Changes (Minimal)](#8-data-model-changes-minimal)
9. [API Endpoints (Priority Roles Only)](#9-api-endpoints-priority-roles-only)
10. [Frontend Pages Required](#10-frontend-pages-required)
11. [Migration Strategy (Safe & Incremental)](#11-migration-strategy-safe--incremental)
12. [Timeline & Milestones](#12-timeline--milestones)
13. [Resource Requirements](#13-resource-requirements)
14. [Risk Mitigation](#14-risk-mitigation)
15. [Success Metrics](#15-success-metrics)

---

## 1. Priority Role Definitions

### 1.1 Role Hierarchy (Simplified)

```
┌─────────────────────────────────────────┐
│          SUPER_ADMIN                     │
│   (System-wide platform management)     │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌──────────────┐        ┌──────────────┐
│ COLLEGE_ADMIN│        │  PRINCIPAL   │
│  (Overall    │        │ (Academic    │
│   Admin)     │        │  Oversight)  │
└──────┬───────┘        └──────┬───────┘
       │                       │
       └───────────┬───────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌────────┐   ┌──────────┐  ┌──────────┐
│  HOD   │   │ TEACHER  │  │STUDENT   │
└───┬────┘   └──────────┘  └──────────┘
    │
    └──────────────────┐
                       │
┌──────────────────────────────────────┐
│     PRIORITY OPERATIONAL ROLES       │
├──────────────────────────────────────┤
│ 1. ACCOUNTANT (Fee management)       │
│ 2. EXAM_COORDINATOR (Exam workflow)  │
│ 3. ADMISSION_OFFICER (Student intake)│
└──────────────────────────────────────┘
```

### 1.2 Detailed Role Specifications

#### **ROLE 1: ACCOUNTANT** (Highest Priority)

| Attribute | Value |
|-----------|-------|
| **User Enum** | `ACCOUNTANT` |
| **Profile Model** | `AccountantProfile` |
| **Reports To** | COLLEGE_ADMIN / PRINCIPAL |
| **Primary Purpose** | Manage all fee collection and payment operations |

**Key Permissions:**

| Permission | Scope | Details |
|-----------|-------|---------|
| View Students with Fees | Read Only | Access to student fee records, payment history |
| Record Offline Payments | Create | Cash, Cheque, DD payments |
| Generate Receipts | Create/Read | PDF receipt generation, email receipts |
| Payment Reports | Read | Daily/weekly/monthly collection reports |
| Reconcile Payments | Update | Handle failed/flagged payments |
| Send Payment Reminders | Create | Manual reminder emails to students |
| View Fee Structures | Read | Cannot modify fee structures |
| Export Payment Data | Read | CSV/Excel export for accounting |

**What Accountant CANNOT Do:**
- ❌ Cannot manage teachers or students
- ❌ Cannot approve admissions
- ❌ Cannot modify fee structures (only COLLEGE_ADMIN)
- ❌ Cannot access attendance or timetables
- ❌ Cannot access exam management

---

#### **ROLE 2: EXAM_COORDINATOR** (Second Priority)

| Attribute | Value |
|-----------|-------|
| **User Enum** | `EXAM_COORDINATOR` |
| **Profile Model** | `ExamCoordinatorProfile` |
| **Reports To** | PRINCIPAL / HOD |
| **Primary Purpose** | Manage examination lifecycle from scheduling to results |

**Key Permissions:**

| Permission | Scope | Details |
|-----------|-------|---------|
| Create Exam Schedules | Create/Read/Update | Define exam dates, times, subjects |
| Assign Exam Rooms | Create/Update | Room allocation for exams |
| Assign Invigilators | Create/Update | Assign teachers to exam duties |
| Generate Hall Tickets | Create/Read | Bulk hall ticket generation |
| Manage Grades/Results | Create/Read/Update | Enter grades, publish results |
| View Student List | Read | For exam scheduling purposes |
| View Teacher List | Read | For invigilation assignment |
| Handle Re-evaluations | Create/Read/Update | Process re-evaluation requests |
| Exam Reports | Read | Pass/fail statistics, subject-wise analysis |

**What Exam Coordinator CANNOT Do:**
- ❌ Cannot manage fee collections
- ❌ Cannot approve admissions
- ❌ Cannot modify fee structures or payment records
- ❌ Cannot deactivate users
- ❌ Cannot access system settings

---

#### **ROLE 3: ADMISSION_OFFICER** (Third Priority)

| Attribute | Value |
|-----------|-------|
| **User Enum** | `ADMISSION_OFFICER` |
| **Profile Model** | `AdmissionOfficerProfile` |
| **Reports To** | COLLEGE_ADMIN / PRINCIPAL |
| **Primary Purpose** | Process student applications and manage admission workflow |

**Key Permissions:**

| Permission | Scope | Details |
|-----------|-------|---------|
| View Pending Applications | Read/Update | Review submitted applications |
| Verify Documents | Read | View uploaded documents for verification |
| Approve Applications | Update | Approve with comments |
| Reject Applications | Update | Reject with reason, allow reapply |
| Bulk Approve Students | Update | Process multiple applications at once |
| Send Admission Emails | Create | Approval/rejection/reminder emails |
| View Admission Stats | Read | Application counts, approval rates |
| Search Applicants | Read | Filter by department, course, status |

**What Admission Officer CANNOT Do:**
- ❌ Cannot manage fees or payments
- ❌ Cannot manage existing approved students (only pending)
- ❌ Cannot manage teachers or departments
- ❌ Cannot access exam management
- ❌ Cannot modify fee structures

---

#### **ROLE 4: PRINCIPAL** (Fourth Priority - Enhancement)

| Attribute | Value |
|-----------|-------|
| **User Enum** | `PRINCIPAL` |
| **Profile Model** | Uses `User` model only (no separate profile needed) |
| **Reports To** | COLLEGE_ADMIN / SUPER_ADMIN |
| **Primary Purpose** | Academic oversight, staff management, reports |

**Principal Permissions:**

| Permission | Scope | Details |
|-----------|-------|---------|
| View All College Data | Read | Students, teachers, fees, attendance, exams |
| Manage Teachers | Read/Update | View, edit, deactivate teachers |
| Manage Students | Read/Update | View students, approve/reject (shared with Admission Officer) |
| View Payment Reports | Read | Financial overview, overdue stats |
| View Attendance Reports | Read | College-wide attendance analytics |
| View Exam Results | Read | All exam data, pass/fail reports |
| Approve Admissions | Update | Shared permission with Admission Officer |
| Send Notifications | Create | College-wide announcements |
| Manage Departments | Read/Update | View departments, assign HODs |

**Principal CANNOT Do:**
- ❌ Cannot create/delete colleges (SUPER_ADMIN only)
- ❌ Cannot modify system-wide settings
- ❌ Cannot access other colleges' data

**Vice Principal Handling:**
- Vice Principal users will have role `PRINCIPAL` with a `delegated: true` flag
- Same portal, same permissions, but marked as "Vice Principal" in UI
- Can be restricted from certain actions (e.g., teacher deactivation) if needed

---

## 2. Vice Principal Decision Rationale

### **Decision: ELIMINATE Vice Principal as Separate Role**

### Why This Makes Sense:

| Factor | Rationale |
|--------|-----------|
| **Identical Authorities** | Vice Principal has same permissions as Principal in most colleges |
| **No Functional Differences** | Both need access to same data, same reports, same management capabilities |
| **Reduced Complexity** | One less role to maintain in code, permissions, and UI |
| **Easier Training** | Staff only need to learn one system (Principal portal) |
| **Flexible Delegation** | Can use flags (`delegated: true`) to differentiate if minor restrictions needed later |
| **Cost Savings** | Fewer permission sets to maintain, test, and document |

### Implementation Approach:

```javascript
// User Model
{
  role: "PRINCIPAL",  // Same enum value for both
  isDelegated: true,   // True for Vice Principal, false for Principal
  delegatedBy: ObjectId // Reference to Principal who delegated (optional)
}

// Permission Check
if (user.role === "PRINCIPAL" && user.isDelegated) {
  // Can access Principal portal
  // Optionally restrict certain actions if needed in future
}
```

### UI Handling:

- Login shows "Principal Dashboard" for both roles
- Vice Principal name shows as "Vice Principal [Name]" in UI
- Same features, same workflow
- Future: If restrictions needed, add permission checks for `isDelegated` users

---

## 3. Implementation Phases (Priority-Based)

### **Phase Strategy: Incremental Rollout with Backward Compatibility**

```
┌─────────────────────────────────────────────────────────────┐
│              Implementation Timeline (10-12 Weeks)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PHASE 1: Foundation (Weeks 1-2)                            │
│  ████████                                                    │
│  • Add priority roles to User enum                          │
│  • Create profile models for priority roles                 │
│  • Permission model & seeding                               │
│  • Auth enhancement (security fields)                       │
│                                                              │
│  PHASE 2: Accountant Workflow (Weeks 3-5)                   │
│              ████████████                                    │
│  • Accountant profile model                                 │
│  • Payment management APIs                                  │
│  • Offline payment recording                                │
│  • Receipt generation                                       │
│  • Frontend: Accountant dashboard & pages                   │
│                                                              │
│  PHASE 3: Admission Officer Workflow (Weeks 4-6)            │
│                        ████████████                          │
│  • Admission profile model                                  │
│  • Application review APIs                                  │
│  • Bulk approval functionality                              │
│  • Frontend: Admission dashboard & pages                    │
│  (Can overlap with Phase 2 - independent workflow)          │
│                                                              │
│  PHASE 4: Exam Coordinator Workflow (Weeks 7-9)             │
│                                  ████████████                │
│  • Exam coordinator profile model                           │
│  • Exam scheduling APIs                                     │
│  • Hall ticket generation                                   │
│  • Results management                                       │
│  • Frontend: Exam coordinator dashboard & pages             │
│                                                              │
│  PHASE 5: Principal Enhancement (Weeks 8-10)                │
│                                        ████████████          │
│  • Principal role implementation                            │
│  • Delegation support (Vice Principal)                      │
│  • Enhanced reporting views                                 │
│  • Frontend: Principal dashboard updates                    │
│                                                              │
│  PHASE 6: Testing & Deployment (Weeks 10-12)                │
│                                          ████████████        │
│  • Integration testing                                      │
│  • UAT with pilot colleges                                  │
│  • Performance optimization                                 │
│  • Production deployment                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Accountant Role - Detailed Workflow

### 4.1 Accountant User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                Accountant User Journey                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Account Creation                                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  College Admin: /users/create                    │      │
│  │  • Selects role: ACCOUNTANT                      │      │
│  │  • Fills: Name, Email, Employee ID               │      │
│  │  • System creates: User + AccountantProfile      │      │
│  │  • Sends invitation email with temp password     │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 2: First Login                                        │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Accountant:                                     │      │
│  │  • Logs in with temp password                    │      │
│  │  • Forced to change password                     │      │
│  │  • Redirected to Accountant Dashboard            │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 3: Daily Workflow                                     │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Morning:                                        │      │
│  │  • View Dashboard:                               │      │
│  │    - Pending fees today: 45 students             │      │
│  │    - Overdue payments: 12 students               │      │
│  │    - Yesterday's collection: ₹1,25,000           │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 4: Payment Collection                                 │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Scenario: Student comes to pay fees             │      │
│  │                                                  │      │
│  │  1. Search student by:                           │      │
│  │     - Name / Roll Number / Email                 │      │
│  │  2. View fee details:                            │      │
│  │     - Total fees: ₹50,000                        │      │
│  │     - Paid: ₹25,000 (Installment 1)              │      │
│  │     - Due: ₹25,000 (Installment 2)               │      │
│  │  3. Record payment:                              │      │
│  │     - Amount: ₹25,000                            │      │
│  │     - Payment mode: CASH / CHEQUE / DD           │      │
│  │     - Reference number (if cheque/DD)            │      │
│  │     - Date: Today                                │      │
│  │  4. System actions:                              │      │
│  │     ✓ Updates StudentFee record                  │      │
│  │     ✓ Marks installment as PAID                  │      │
│  │     ✓ Generates receipt PDF                      │      │
│  │     ✓ Sends email receipt to student             │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 5: End of Day Reports                                 │
│  ┌──────────────────────────────────────────────────┐      │
│  │  • View daily collection report                  │      │
│  │  • Export to Excel for accounting                │      │
│  │  • Reconcile cash/cheque with recorded payments  │      │
│  │  • View flagged payments (need review)           │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Accountant Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│              Accountant Dashboard                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Quick Stats                                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │ Today's     │ Pending     │ Overdue     │ This Month  │ │
│  │ Collection  │ Payments    │ Payments    │ Collection  │ │
│  │ ₹1,25,000   │ 45          │ 12          │ ₹8,45,000   │ │
│  │ ↑ 15%       │             │             │             │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
│                                                              │
│  Quick Actions                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ Record Payment      │  │ Generate Receipt    │         │
│  │ [Search Student]    │  │ [Enter Receipt #]   │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                              │
│  Pending Payments (Due Today)                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Student Name    │ Amount    │ Due Date │ Actions   │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ John Doe        │ ₹25,000   │ Today    │ [Record]  │    │
│  │ Sarah Smith     │ ₹15,000   │ Today    │ [Record]  │    │
│  │ ...             │ ...       │ ...      │ ...       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Recent Payments                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Student Name    │ Amount    │ Mode  │ Time          │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Mike Johnson    │ ₹25,000   │ CASH  │ 10:30 AM      │    │
│  │ Emma Wilson     │ ₹15,000   │ CHEQUE│ 11:15 AM      │    │
│  │ ...             │ ...       │ ...   │ ...           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Flagged Payments (Need Review)                             │
│  ⚠ 3 payments require manual reconciliation [View]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Accountant API Endpoints

```
# Payment Management
POST   /api/accountants/payments/record        # Record offline payment
GET    /api/accountants/payments/today         # Today's payments
GET    /api/accountants/payments/pending       # Pending payments
GET    /api/accountants/payments/overdue       # Overdue payments
GET    /api/accountants/payments/flagged       # Flagged payments (reconciliation)

# Receipt Management
POST   /api/accountants/receipts/generate      # Generate receipt PDF
GET    /api/accountants/receipts/:receiptId    # Get receipt
POST   /api/accountants/receipts/:receiptId/email # Email receipt

# Reports
GET    /api/accountants/reports/daily          # Daily collection report
GET    /api/accountants/reports/weekly         # Weekly collection report
GET    /api/accountants/reports/monthly        # Monthly collection report
GET    /api/accountants/reports/export         # Export to CSV/Excel

# Reminders
POST   /api/accountants/reminders/send         # Send payment reminder
POST   /api/accountants/reminders/bulk-send    # Bulk send reminders

# Student Fee Lookup
GET    /api/accountants/students/:studentId/fees # View student fees
```

---

## 5. Exam Coordinator Role - Detailed Workflow

### 5.1 Exam Coordinator User Journey

```
┌─────────────────────────────────────────────────────────────┐
│            Exam Coordinator User Journey                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Account Creation                                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  College Admin: /users/create                    │      │
│  │  • Selects role: EXAM_COORDINATOR                │      │
│  │  • Fills: Name, Email, Department                │      │
│  │  • System creates: User + ExamCoordinatorProfile │      │
│  │  • Sends invitation email                        │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 2: Exam Scheduling (Weeks Before Exam)                │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Exam Coordinator:                               │      │
│  │  1. Navigate to: Exam Schedules                  │      │
│  │  2. Click: "Create Exam Schedule"                │      │
│  │  3. Fill form:                                   │      │
│  │     - Exam Name: "Semester 6 - Final Exams"      │      │
│  │     - Exam Type: THEORY / PRACTICAL              │      │
│  │     - Start Date: 2026-05-15                     │      │
│  │     - End Date: 2026-05-30                       │      │
│  │     - Courses: [Select courses]                  │      │
│  │     - Semesters: [Select semesters]              │      │
│  │  4. System creates exam schedule                 │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 3: Subject & Room Assignment                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  For each subject:                               │      │
│  │  1. Select subject from course                   │      │
│  │  2. Assign date & time:                          │      │
│  │     - Date: 2026-05-15                           │      │
│  │     - Time: 10:00 AM - 1:00 PM                   │      │
│  │  3. Assign room(s):                              │      │
│  │     - Room: Hall A (Capacity: 100)               │      │
│  │     - Room: Hall B (Capacity: 80)                │      │
│  │  4. Assign invigilators (Teachers):              │      │
│  │     - Teacher 1: Hall A                          │      │
│  │     - Teacher 2: Hall B                          │      │
│  │  5. System checks:                               │      │
│  │     ✓ Teacher availability (no conflicts)        │      │
│  │     ✓ Room capacity >= enrolled students         │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 4: Hall Ticket Generation                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  1. Navigate to: Hall Tickets                    │      │
│  │  2. Select: Exam Schedule                        │      │
│  │  3. Click: "Generate Hall Tickets"               │      │
│  │  4. System generates PDF for all students:       │      │
│  │     - Student details (name, roll number)        │      │
│  │     - Exam schedule with subjects, dates, rooms  │      │
│  │     - Important instructions                     │      │
│  │  5. Options:                                     │      │
│  │     - Download all (ZIP)                         │      │
│  │     - Email to students                          │      │
│  │     - Print batch                                │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 5: Results Management (After Exams)                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  1. Navigate to: Results                         │      │
│  │  2. Select: Exam Schedule                        │      │
│  │  3. Enter grades:                                │      │
│  │     - Option A: Manual entry per student         │      │
│  │     - Option B: Bulk upload (Excel template)     │      │
│  │  4. Review grades before publishing              │      │
│  │  5. Publish results:                             │      │
│  │     - Students can view results                  │      │
│  │     - System sends notification                  │      │
│  │  6. Handle re-evaluation requests                │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Exam Coordinator Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│            Exam Coordinator Dashboard                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Quick Stats                                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │ Upcoming    │ Ongoing     │ Pending     │ Re-eval     │ │
│  │ Exams       │ Exams       │ Results     │ Requests    │ │
│  │ 2           │ 1           │ 3           │ 5           │ │
│  │ (Next: 15th)│ (Today)    │             │             │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
│                                                              │
│  Quick Actions                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ Create Exam Schedule│  │ Generate Hall Tickets│         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                              │
│  Upcoming Exams                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Exam Name          │ Dates         │ Courses │ Status│    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Semester 6 Finals  │ May 15-30     │ B.Sc CS │ Draft │    │
│  │ Mid-Term Exams     │ Jun 10-20     │ All     │ Draft │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Pending Results                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Exam Name          │ Subjects | Students │ Actions │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Semester 5 Pract.  │ 5        │ 120      │ [Enter] │    │
│  │ Internal Assessment│ 3        │ 85       │ [Enter] │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Exam Coordinator API Endpoints

```
# Exam Schedule Management
POST   /api/exams/schedules                  # Create exam schedule
GET    /api/exams/schedules                  # List exam schedules
GET    /api/exams/schedules/:id              # Get exam schedule details
PUT    /api/exams/schedules/:id              # Update exam schedule
DELETE /api/exams/schedules/:id              # Delete exam schedule

# Subject & Room Assignment
POST   /api/exams/schedules/:id/subjects     # Add subject to schedule
PUT    /api/exams/schedules/:id/subjects/:sid # Update subject assignment
POST   /api/exams/schedules/:id/rooms        # Assign rooms
POST   /api/exams/schedules/:id/invigilators # Assign invigilators (teachers)

# Hall Tickets
POST   /api/exams/schedules/:id/hall-tickets # Generate hall tickets
GET    /api/exams/schedules/:id/hall-tickets # Get generated hall tickets
POST   /api/exams/schedules/:id/hall-tickets/email # Email to students

# Results Management
POST   /api/exams/schedules/:id/results      # Enter results (single)
POST   /api/exams/schedules/:id/results/bulk # Bulk upload results (Excel)
GET    /api/exams/schedules/:id/results      # View results
PUT    /api/exams/schedules/:id/results/publish # Publish results
GET    /api/exams/schedules/:id/results/stats # Result statistics

# Re-evaluation
POST   /api/exams/re-evaluations             # Request re-evaluation
GET    /api/exams/re-evaluations             # List re-evaluation requests
PUT    /api/exams/re-evaluations/:id         # Update status

# Reports
GET    /api/exams/reports/pass-fail          # Pass/fail statistics
GET    /api/exams/reports/subject-wise       # Subject-wise analysis
GET    /api/exams/reports/export             # Export results (CSV/Excel)
```

---

## 6. Admission Officer Role - Detailed Workflow

### 6.1 Admission Officer User Journey

```
┌─────────────────────────────────────────────────────────────┐
│            Admission Officer User Journey                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Account Creation                                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  College Admin: /users/create                    │      │
│  │  • Selects role: ADMISSION_OFFICER               │      │
│  │  • Fills: Name, Email, Department                │      │
│  │  • System creates: User + AdmissionOfficerProfile│      │
│  │  • Sends invitation email                        │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 2: Daily Workflow - Application Review                │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Morning:                                        │      │
│  │  • View Dashboard:                               │      │
│  │    - New applications today: 15                  │      │
│  │    - Pending review: 42                          │      │
│  │    - Approved this week: 125                     │      │
│  │    - Rejection rate: 8%                          │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 3: Review Individual Application                      │
│  ┌──────────────────────────────────────────────────┐      │
│  │  1. Navigate to: Pending Applications            │      │
│  │  2. Click on application to review               │      │
│  │  3. View application details:                    │      │
│  │     - Personal information                       │      │
│  │     - Academic records (SSC, HSC)                │      │
│  │     - Uploaded documents (marksheets, etc.)      │      │
│  │     - Course applied for                         │      │
│  │  4. Verify documents:                            │      │
│  │     ✓ Marksheets match entered data              │      │
│  │     ✓ Required documents uploaded                │      │
│  │     ✓ Eligibility criteria met                   │      │
│  │  5. Decision:                                    │      │
│  │     APPROVE:                                     │      │
│  │       - Add approval notes (optional)            │      │
│  │       - System creates User account              │      │
│  │       - System creates fee record                │      │
│  │       - System sends approval email              │      │
│  │     REJECT:                                      │      │
│  │       - Must provide rejection reason            │      │
│  │       - Allow reapply: Yes/No                    │      │
│  │       - System sends rejection email             │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 4: Bulk Approval (High Volume Days)                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  1. Navigate to: Pending Applications            │      │
│  │  2. Filter applications (by course, department)  │      │
│  │  3. Select multiple applications (checkboxes)    │      │
│  │  4. Click: "Bulk Approve"                        │      │
│  │  5. Confirm bulk approval                        │      │
│  │  6. System processes all:                        │      │
│  │     ✓ Creates User accounts                      │      │
│  │     ✓ Creates fee records                        │      │
│  │     ✓ Sends approval emails                      │      │
│  │  7. Shows summary report:                        │      │
│  │     - Successfully approved: 30                  │      │
│  │     - Failed (duplicate email): 2                │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 5: Admission Reports                                  │
│  ┌──────────────────────────────────────────────────┐      │
│  │  • View admission statistics                     │      │
│  │    - Applications by course                      │      │
│  │    - Approval/rejection rates                    │      │
│  │    - Demographics                                │      │
│  │  • Export data for management review             │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Admission Officer Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│            Admission Officer Dashboard                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Quick Stats                                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │ New Today   │ Pending     │ Approved    │ Rejection   │ │
│  │             │ Review      │ This Week   │ Rate        │ │
│  │ 15          │ 42          │ 125         │ 8%          │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
│                                                              │
│  Quick Actions                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ Review Applications │  │ Bulk Approve        │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                              │
│  Applications by Course                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Course            │ Applied │ Approved │ Pending   │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ B.Sc Computer Sci │ 250     │ 180      │ 70        │    │
│  │ B.A. English      │ 180     │ 120      │ 60        │    │
│  │ B.Com             │ 200     │ 150      │ 50        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Recent Applications (Pending)                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Name       │ Course    │ Applied On │ Status│Action│    │
│  ├────────────────────────────────────────────────────┤    │
│  │ John Doe   │ B.Sc CS   │ Today      │ NEW   │[View]│    │
│  │ Sarah Smith│ B.A. Eng  │ Today      │ NEW   │[View]│    │
│  │ ...        │ ...       │ ...        │ ...   │...   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Admission Officer API Endpoints

```
# Application Review
GET    /api/admissions/applications/pending    # List pending applications
GET    /api/admissions/applications/:id        # Get application details
PUT    /api/admissions/applications/:id/approve # Approve application
PUT    /api/admissions/applications/:id/reject  # Reject application
POST   /api/admissions/applications/bulk-approve # Bulk approve

# Document Verification
GET    /api/admissions/applications/:id/documents # View documents
PUT    /api/admissions/applications/:id/verify-docs # Mark docs verified

# Reports
GET    /api/admissions/reports/summary         # Admission summary
GET    /api/admissions/reports/by-course       # Applications by course
GET    /api/admissions/reports/by-department   # Applications by department
GET    /api/admissions/reports/export          # Export data (CSV/Excel)

# Communication
POST   /api/admissions/communications/send-email # Send email to applicant
```

---

## 7. Principal Role - Enhanced Workflow

### 7.1 Principal User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                Principal User Journey                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Account Creation                                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Super Admin or College Admin creates:           │      │
│  │  • Role: PRINCIPAL                               │      │
│  │  • For Vice Principal: isDelegated: true         │      │
│  │  • Fills: Name, Email                            │      │
│  │  • System creates: User record                   │      │
│  │  • Sends invitation email                        │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         ▼                                   │
│  Step 2: Principal Dashboard                                │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Principal logs in and sees:                     │      │
│  │                                                  │      │
│  │  College Overview:                               │      │
│  │  • Total students: 1,250                         │      │
│  │  • Total teachers: 85                            │      │
│  │  • Attendance rate: 82%                          │      │
│  │  • Fee collection rate: 78%                      │      │
│  │  • Pending admissions: 42                        │      │
│  │                                                  │      │
│  │  Quick Access:                                   │      │
│  │  • View Teachers [→]                             │      │
│  │  • View Students [→]                             │      │
│  │  • View Payment Reports [→]                      │      │
│  │  • View Attendance Reports [→]                   │      │
│  │  • View Exam Results [→]                         │      │
│  │  • Approve Admissions [→]                        │      │
│  │  • Send Notification [→]                         │      │
│  └──────────────────────────────────────────────────┘      │
│                         ▼                                   │
│  Step 3: Staff Management                                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Principal can:                                  │      │
│  │  • View all teachers (list with details)         │      │
│  │  • View teacher performance (attendance stats)   │      │
│  │  • Edit teacher information                      │      │
│  │  • Deactivate teacher (requires reassignment)    │      │
│  │  • Assign HOD to departments                     │      │
│  │                                                  │      │
│  │  Note: Vice Principal (isDelegated: true)        │      │
│  │  cannot deactivate teachers                      │      │
│  └──────────────────────────────────────────────────┘      │
│                         ▼                                   │
│  Step 4: Reporting & Analytics                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Principal can view all reports:                 │      │
│  │  • Admission reports                             │      │
│  │  • Payment collection reports                    │      │
│  │  • Attendance reports (students & teachers)      │      │
│  │  • Exam results & analytics                      │      │
│  │  • Department-wise performance                   │      │
│  │  • Trend analysis (semester-over-semester)       │      │
│  │                                                  │      │
│  │  Export options: PDF, Excel                      │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Principal API Endpoints

```
# Dashboard & Overview
GET    /api/principal/dashboard              # Principal dashboard data

# Staff Management
GET    /api/principal/teachers               # View all teachers
GET    /api/principal/teachers/:id           # View teacher details
PUT    /api/principal/teachers/:id           # Update teacher
PUT    /api/principal/teachers/:id/deactivate # Deactivate teacher
PUT    /api/principal/departments/:id/hod    # Assign HOD

# Reporting (Read-Only Access to All Reports)
GET    /api/principal/reports/admission      # Admission reports
GET    /api/principal/reports/payments       # Payment reports
GET    /api/principal/reports/attendance     # Attendance reports
GET    /api/principal/reports/exams          # Exam reports
GET    /api/principal/reports/export         # Export all reports

# Admissions (Shared with Admission Officer)
GET    /api/principal/admissions/pending     # View pending applications
PUT    /api/principal/admissions/:id/approve # Approve application
PUT    /api/principal/admissions/:id/reject  # Reject application

# Notifications
POST   /api/principal/notifications          # Create notification
GET    /api/principal/notifications          # View notifications
```

---

## 8. Data Model Changes (Minimal)

### 8.1 User Model Updates

```javascript
// CURRENT User Model
{
  college_id: ObjectId,
  name: String,
  email: String,
  password: String,
  role: ["SUPER_ADMIN", "COLLEGE_ADMIN", "TEACHER", "STUDENT"],
  isActive: Boolean
}

// UPDATED User Model (Minimal Changes)
{
  college_id: ObjectId,
  name: String,
  email: String,
  password: String,
  role: [
    "SUPER_ADMIN",
    "COLLEGE_ADMIN",
    "PRINCIPAL",           // NEW
    "TEACHER",
    "ACCOUNTANT",          // NEW
    "ADMISSION_OFFICER",   // NEW
    "EXAM_COORDINATOR",    // NEW
    "STUDENT"
  ],
  isActive: Boolean,
  
  // NEW: For Vice Principal handling
  isDelegated: Boolean,       // default: false
  delegatedBy: ObjectId,      // ref: User (who delegated authority)
  
  // NEW: Security & tracking
  lastLoginAt: Date,
  failedLoginAttempts: Number,  // default: 0
  lockedUntil: Date
}
```

### 8.2 New Profile Models

#### Accountant Profile Model

```javascript
// accountant.model.js
{
  _id: ObjectId,
  college_id: ObjectId,        // ref: College (required)
  user_id: ObjectId,           // ref: User (required, unique)
  employeeId: String,          // required
  department: String,          // default: "Administration"
  qualification: String,
  joiningDate: Date,
  status: {                    // enum
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE"
  },
  createdBy: ObjectId,         // ref: User
  createdAt: Date,
  updatedAt: Date
}
```

#### Admission Officer Profile Model

```javascript
// admissionOfficer.model.js
{
  _id: ObjectId,
  college_id: ObjectId,        // ref: College (required)
  user_id: ObjectId,           // ref: User (required, unique)
  employeeId: String,          // required
  department: String,          // default: "Admissions"
  designation: String,         // e.g., "Admission Manager"
  joiningDate: Date,
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE"
  },
  createdBy: ObjectId,         // ref: User
  createdAt: Date,
  updatedAt: Date
}
```

#### Exam Coordinator Profile Model

```javascript
// examCoordinator.model.js
{
  _id: ObjectId,
  college_id: ObjectId,        // ref: College (required)
  user_id: ObjectId,           // ref: User (required, unique)
  employeeId: String,          // required
  department: String,          // default: "Examinations"
  designation: String,
  joiningDate: Date,
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE"
  },
  createdBy: ObjectId,         // ref: User
  createdAt: Date,
  updatedAt: Date
}
```

### 8.3 Permission Model

```javascript
// permission.model.js
{
  _id: ObjectId,
  role: {                      // unique
    type: String,
    required: true
  },
  permissions: [{
    resource: String,          // e.g., "payments", "students", "exams"
    actions: [String]          // e.g., ["create", "read", "update"]
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 8.4 New Models for Exam Management

#### Exam Schedule Model

```javascript
// examSchedule.model.js
{
  _id: ObjectId,
  college_id: ObjectId,        // ref: College (required)
  name: String,                // required
  examType: {                  // enum
    type: String,
    enum: ["THEORY", "PRACTICAL", "INTERNAL", "EXTERNAL"]
  },
  startDate: Date,             // required
  endDate: Date,               // required
  courses: [ObjectId],         // ref: Course
  semesters: [Number],
  status: {                    // enum
    type: String,
    enum: ["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED"],
    default: "DRAFT"
  },
  createdBy: ObjectId,         // ref: User (Exam Coordinator)
  createdAt: Date,
  updatedAt: Date
}
```

#### Exam Subject Assignment Model

```javascript
// examSubject.model.js
{
  _id: ObjectId,
  exam_schedule_id: ObjectId,  // ref: ExamSchedule (required)
  subject_id: ObjectId,        // ref: Subject (required)
  date: Date,                  // required
  startTime: String,           // e.g., "10:00 AM"
  endTime: String,             // e.g., "1:00 PM"
  rooms: [{                    // room assignments
    room_id: ObjectId,         // ref: ExamRoom
    capacity: Number,
    assignedStudents: [ObjectId] // ref: Student
  }],
  invigilators: [{             // teacher assignments
    teacher_id: ObjectId,      // ref: Teacher
    room_id: ObjectId
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### Exam Result Model

```javascript
// examResult.model.js
{
  _id: ObjectId,
  exam_schedule_id: ObjectId,  // ref: ExamSchedule (required)
  student_id: ObjectId,        // ref: Student (required)
  subject_id: ObjectId,        // ref: Subject (required)
  grade: String,               // e.g., "A+", "B", "PASS", "FAIL"
  marks: Number,               // numeric marks
  totalMarks: Number,
  status: {                    // enum
    type: String,
    enum: ["DRAFT", "PUBLISHED"],
    default: "DRAFT"
  },
  publishedAt: Date,
  publishedBy: ObjectId,       // ref: User
  createdAt: Date,
  updatedAt: Date
}
```

---

## 9. API Endpoints (Priority Roles Only)

### 9.1 User Management (Base)

```
# User CRUD (Enhanced with new roles)
POST   /api/users                      # Create user (any role)
GET    /api/users                      # List users (with role filter)
GET    /api/users/:id                  # Get user details
PUT    /api/users/:id                  # Update user
PUT    /api/users/:id/deactivate       # Deactivate user
PUT    /api/users/:id/reactivate       # Reactivate user
PUT    /api/users/:id/reset-password   # Admin password reset

# Auth Enhancement
POST   /api/auth/verify-email          # Email verification
POST   /api/auth/unlock-account        # Unlock locked account
```

### 9.2 Accountant APIs

```
# Payment Management
POST   /api/accountants/payments/record        # Record offline payment
GET    /api/accountants/payments/today         # Today's payments
GET    /api/accountants/payments/pending       # Pending payments
GET    /api/accountants/payments/overdue       # Overdue payments
GET    /api/accountants/payments/flagged       # Flagged payments

# Receipt Management
POST   /api/accountants/receipts/generate      # Generate receipt PDF
GET    /api/accountants/receipts/:receiptId    # Get receipt
POST   /api/accountants/receipts/:receiptId/email # Email receipt

# Reports
GET    /api/accountants/reports/daily          # Daily collection report
GET    /api/accountants/reports/weekly         # Weekly collection report
GET    /api/accountants/reports/monthly        # Monthly collection report
GET    /api/accountants/reports/export         # Export to CSV/Excel

# Reminders
POST   /api/accountants/reminders/send         # Send payment reminder
POST   /api/accountants/reminders/bulk-send    # Bulk send reminders

# Student Fee Lookup
GET    /api/accountants/students/:studentId/fees # View student fees
```

### 9.3 Admission Officer APIs

```
# Application Review
GET    /api/admissions/applications/pending    # List pending applications
GET    /api/admissions/applications/:id        # Get application details
PUT    /api/admissions/applications/:id/approve # Approve application
PUT    /api/admissions/applications/:id/reject  # Reject application
POST   /api/admissions/applications/bulk-approve # Bulk approve

# Document Verification
GET    /api/admissions/applications/:id/documents # View documents
PUT    /api/admissions/applications/:id/verify-docs # Mark docs verified

# Reports
GET    /api/admissions/reports/summary         # Admission summary
GET    /api/admissions/reports/by-course       # Applications by course
GET    /api/admissions/reports/export          # Export data

# Communication
POST   /api/admissions/communications/send-email # Send email to applicant
```

### 9.4 Exam Coordinator APIs

```
# Exam Schedule Management
POST   /api/exams/schedules                  # Create exam schedule
GET    /api/exams/schedules                  # List exam schedules
GET    /api/exams/schedules/:id              # Get exam schedule details
PUT    /api/exams/schedules/:id              # Update exam schedule
DELETE /api/exams/schedules/:id              # Delete exam schedule

# Subject & Room Assignment
POST   /api/exams/schedules/:id/subjects     # Add subject to schedule
PUT    /api/exams/schedules/:id/subjects/:sid # Update subject assignment
POST   /api/exams/schedules/:id/rooms        # Assign rooms
POST   /api/exams/schedules/:id/invigilators # Assign invigilators

# Hall Tickets
POST   /api/exams/schedules/:id/hall-tickets # Generate hall tickets
GET    /api/exams/schedules/:id/hall-tickets # Get generated hall tickets
POST   /api/exams/schedules/:id/hall-tickets/email # Email to students

# Results Management
POST   /api/exams/schedules/:id/results      # Enter results (single)
POST   /api/exams/schedules/:id/results/bulk # Bulk upload results
GET    /api/exams/schedules/:id/results      # View results
PUT    /api/exams/schedules/:id/results/publish # Publish results
GET    /api/exams/schedules/:id/results/stats # Result statistics

# Re-evaluation
POST   /api/exams/re-evaluations             # Request re-evaluation
GET    /api/exams/re-evaluations             # List re-evaluation requests
PUT    /api/exams/re-evaluations/:id         # Update status

# Reports
GET    /api/exams/reports/pass-fail          # Pass/fail statistics
GET    /api/exams/reports/subject-wise       # Subject-wise analysis
GET    /api/exams/reports/export             # Export results
```

### 9.5 Principal APIs

```
# Dashboard & Overview
GET    /api/principal/dashboard              # Principal dashboard data

# Staff Management
GET    /api/principal/teachers               # View all teachers
GET    /api/principal/teachers/:id           # View teacher details
PUT    /api/principal/teachers/:id           # Update teacher
PUT    /api/principal/teachers/:id/deactivate # Deactivate teacher
PUT    /api/principal/departments/:id/hod    # Assign HOD

# Reporting (Read-Only Access)
GET    /api/principal/reports/admission      # Admission reports
GET    /api/principal/reports/payments       # Payment reports
GET    /api/principal/reports/attendance     # Attendance reports
GET    /api/principal/reports/exams          # Exam reports
GET    /api/principal/reports/export         # Export all reports

# Admissions (Shared)
GET    /api/principal/admissions/pending     # View pending applications
PUT    /api/principal/admissions/:id/approve # Approve application
PUT    /api/principal/admissions/:id/reject  # Reject application

# Notifications
POST   /api/principal/notifications          # Create notification
GET    /api/principal/notifications          # View notifications
```

---

## 10. Frontend Pages Required

### 10.1 Shared Pages (All Roles)

| Page | Route | Roles | Purpose |
|------|-------|-------|---------|
| Login | `/login` | All | Unified login |
| Dashboard | `/:role/dashboard` | All | Role-specific dashboard |
| Profile | `/profile` | All | View/edit profile |
| Notifications | `/notifications` | All | View notifications |

### 10.2 Accountant Pages

| Page | Route | Component | Purpose |
|------|-------|-----------|---------|
| Accountant Dashboard | `/accountant/dashboard` | `AccountantDashboard.jsx` | Overview, quick stats |
| Record Payment | `/accountant/payments/record` | `RecordPayment.jsx` | Search student, record payment |
| Payment History | `/accountant/payments/history` | `PaymentHistory.jsx` | List all recorded payments |
| Pending Payments | `/accountant/payments/pending` | `PendingPayments.jsx` | Students with due fees |
| Generate Receipt | `/accountant/receipts/generate` | `GenerateReceipt.jsx` | Generate receipt by receipt # |
| Receipt List | `/accountant/receipts` | `ReceiptList.jsx` | View generated receipts |
| Daily Report | `/accountant/reports/daily` | `DailyReport.jsx` | Daily collection report |
| Monthly Report | `/accountant/reports/monthly` | `MonthlyReport.jsx` | Monthly collection report |
| Flagged Payments | `/accountant/payments/flagged` | `FlaggedPayments.jsx` | Reconciliation queue |

### 10.3 Admission Officer Pages

| Page | Route | Component | Purpose |
|------|-------|-----------|---------|
| Admission Dashboard | `/admissions/dashboard` | `AdmissionDashboard.jsx` | Overview, quick stats |
| Pending Applications | `/admissions/pending` | `PendingApplications.jsx` | List pending applications |
| Review Application | `/admissions/review/:id` | `ReviewApplication.jsx` | Review individual application |
| Approved Students | `/admissions/approved` | `ApprovedStudents.jsx` | List approved students |
| Rejected Applications | `/admissions/rejected` | `RejectedApplications.jsx` | List rejected applications |
| Bulk Approve | `/admissions/bulk-approve` | `BulkApprove.jsx` | Bulk approval interface |
| Admission Reports | `/admissions/reports` | `AdmissionReports.jsx` | Admission statistics |

### 10.4 Exam Coordinator Pages

| Page | Route | Component | Purpose |
|------|-------|-----------|---------|
| Exam Dashboard | `/exams/dashboard` | `ExamDashboard.jsx` | Overview, upcoming exams |
| Exam Schedules | `/exams/schedules` | `ExamSchedulesList.jsx` | List exam schedules |
| Create Exam Schedule | `/exams/schedules/create` | `CreateExamSchedule.jsx` | Create new exam schedule |
| Edit Exam Schedule | `/exams/schedules/edit/:id` | `EditExamSchedule.jsx` | Edit exam schedule |
| Assign Subjects | `/exams/schedules/:id/subjects` | `AssignExamSubjects.jsx` | Assign subjects, dates, rooms |
| Assign Invigilators | `/exams/schedules/:id/invigilators` | `AssignInvigilators.jsx` | Assign teachers |
| Hall Tickets | `/exams/schedules/:id/hall-tickets` | `HallTickets.jsx` | Generate & view hall tickets |
| Enter Results | `/exams/schedules/:id/results` | `EnterResults.jsx` | Enter exam results |
| Bulk Upload Results | `/exams/schedules/:id/results/upload` | `BulkUploadResults.jsx` | Excel upload |
| Published Results | `/exams/results/published` | `PublishedResults.jsx` | View published results |
| Re-evaluation Queue | `/exams/re-evaluations` | `ReEvaluationQueue.jsx` | Pending re-evaluation requests |
| Exam Reports | `/exams/reports` | `ExamReports.jsx` | Pass/fail statistics |

### 10.5 Principal Pages

| Page | Route | Component | Purpose |
|------|-------|-----------|---------|
| Principal Dashboard | `/principal/dashboard` | `PrincipalDashboard.jsx` | College overview |
| Teachers List | `/principal/teachers` | `PrincipalTeachersList.jsx` | View all teachers |
| View Teacher | `/principal/teachers/:id` | `ViewTeacher.jsx` | Teacher details |
| Students List | `/principal/students` | `PrincipalStudentsList.jsx` | View all students |
| Payment Reports | `/principal/reports/payments` | `PaymentReports.jsx` | Payment overview |
| Attendance Reports | `/principal/reports/attendance` | `AttendanceReports.jsx` | Attendance analytics |
| Exam Reports | `/principal/reports/exams` | `ExamReports.jsx` | Exam analytics |
| Admission Reports | `/principal/reports/admissions` | `AdmissionReports.jsx` | Admission overview |
| Notifications | `/principal/notifications` | `PrincipalNotifications.jsx` | Create notifications |

### 10.6 Sidebar Navigation (By Role)

#### Accountant Sidebar
```
📊 Dashboard
💰 Payments
   ├─ Record Payment
   ├─ Pending Payments
   └─ Payment History
📄 Receipts
   ├─ Generate Receipt
   └─ Receipt List
📈 Reports
   ├─ Daily Report
   └─ Monthly Report
⚠️ Flagged Payments
👤 My Profile
🔔 Notifications
```

#### Admission Officer Sidebar
```
📊 Dashboard
📝 Applications
   ├─ Pending Applications
   ├─ Approved Students
   └─ Rejected Applications
⚡ Bulk Actions
   └─ Bulk Approve
📈 Reports
👤 My Profile
🔔 Notifications
```

#### Exam Coordinator Sidebar
```
📊 Dashboard
📅 Exam Schedules
   ├─ All Schedules
   ├─ Create New
   └─ Draft Schedules
🎓 Hall Tickets
📝 Results
   ├─ Enter Results
   ├─ Bulk Upload
   └─ Published Results
🔄 Re-evaluations
📈 Reports
👤 My Profile
🔔 Notifications
```

#### Principal Sidebar
```
📊 Dashboard
👨‍🏫 Staff
   ├─ Teachers
   └─ Departments
👨‍🎓 Students
📈 Reports
   ├─ Admissions
   ├─ Payments
   ├─ Attendance
   └─ Exams
📢 Notifications
👤 My Profile
🔔 Notifications
```

---

## 11. Migration Strategy (Safe & Incremental)

### 11.1 Migration Principles

1. **Zero Downtime:** Existing Students and Teachers continue working without interruption
2. **Feature Flags:** Enable new roles gradually, disable if issues arise
3. **Backward Compatible:** Old APIs remain functional during transition
4. **Test First:** All migrations tested on staging before production
5. **Rollback Ready:** Rollback scripts tested and ready

### 11.2 Migration Steps

```
┌─────────────────────────────────────────────────────────────┐
│                Migration Sequence                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Schema Deployment (Week 1)                         │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Actions:                                        │      │
│  │  ✓ Add new roles to User.role enum               │      │
│  │     (ACCOUNTANT, ADMISSION_OFFICER,              │      │
│  │      EXAM_COORDINATOR, PRINCIPAL)                │      │
│  │  ✓ Add new fields to User model                  │      │
│  │     (isDelegated, lastLoginAt,                   │      │
│  │      failedLoginAttempts, lockedUntil)           │      │
│  │  ✓ Deploy new profile models                     │      │
│  │     (Accountant, AdmissionOfficer,               │      │
│  │      ExamCoordinator)                            │      │
│  │  ✓ Deploy Permission model                       │      │
│  │  ✓ Deploy exam models (ExamSchedule,             │      │
│  │     ExamSubject, ExamResult)                     │      │
│  │                                                  │      │
│  │  Impact: NONE (backward compatible)              │      │
│  │  Rollback: Revert schema if needed               │      │
│  │  Testing: Verify existing login still works      │      │
│  └──────────────────────────────────────────────────┘      │
│                         ▼                                   │
│  Step 2: Permission Seeding (Week 1)                        │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Actions:                                        │      │
│  │  ✓ Run seed-permissions.js                       │      │
│  │  ✓ Create permission sets for:                   │      │
│  │    - ACCOUNTANT                                  │      │
│  │    - ADMISSION_OFFICER                           │      │
│  │    - EXAM_COORDINATOR                            │      │
│  │    - PRINCIPAL                                   │      │
│  │  ✓ Verify permissions match capability matrix    │      │
│  │                                                  │      │
│  │  Validation:                                     │      │
│  │  • All roles have permissions defined            │      │
│  │  • Permission checks work correctly              │      │
│  └──────────────────────────────────────────────────┘      │
│                         ▼                                   │
│  Step 3: Auth Enhancement (Week 2)                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Actions:                                        │      │
│  │  ✓ Update auth.controller.js                     │      │
│  │     - Unified login for all roles                │      │
│  │     - Add brute force protection                 │      │
│  │     - Add lastLoginAt tracking                   │      │
│  │  ✓ Enable with feature flag: ENHANCED_AUTH=true  │      │
│  │                                                  │      │
│  │  Testing:                                        │      │
│  │  • Test login for existing Students/Teachers     │      │
│  │  • Test login for new role users                 │      │
│  │  • Verify token generation                       │      │
│  │  • Test account lockout after 5 failed attempts  │      │
│  └──────────────────────────────────────────────────┘      │
│                         ▼                                   │
│  Step 4: Backend APIs (Weeks 2-6)                           │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Deploy APIs incrementally by role:              │      │
│  │                                                  │      │
│  │  Week 2-3: Accountant APIs                       │      │
│  │  Week 3-4: Admission Officer APIs                │      │
│  │  Week 5-6: Exam Coordinator APIs                 │      │
│  │  Week 5-6: Principal APIs                        │      │
│  │                                                  │      │
│  │  Each API deployment includes:                   │      │
│  │  ✓ Route definition                              │      │
│  │  ✓ Controller logic                              │      │
│  │  ✓ Permission middleware                         │      │
│  │  ✓ Unit tests                                    │      │
│  │  ✓ API documentation                             │      │
│  └──────────────────────────────────────────────────┘      │
│                         ▼                                   │
│  Step 5: Frontend Deployment (Weeks 4-10)                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Deploy frontend pages incrementally:            │      │
│  │                                                  │      │
│  │  Week 4-5: Accountant pages                      │      │
│  │  Week 5-6: Admission Officer pages               │      │
│  │  Week 7-9: Exam Coordinator pages                │      │
│  │  Week 8-10: Principal pages                      │      │
│  │                                                  │      │
│  │  Enable with feature flags:                      │      │
│  │  • SHOW_ACCOUNTANT_UI=true                       │      │
│  │  • SHOW_ADMISSION_UI=true                        │      │
│  │  • SHOW_EXAM_UI=true                             │      │
│  │  • SHOW_PRINCIPAL_UI=true                        │      │
│  └──────────────────────────────────────────────────┘      │
│                         ▼                                   │
│  Step 6: Integration Testing (Weeks 10-12)                  │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Actions:                                        │      │
│  │  ✓ End-to-end testing for each role workflow     │      │
│  │  ✓ Cross-role interaction testing                │      │
│  │  ✓ Performance testing (load, stress)            │      │
│  │  ✓ Security testing (penetration, auth bypass)   │      │
│  │  ✓ UAT with pilot colleges                       │      │
│  │                                                  │      │
│  │  Test Scenarios:                                 │      │
│  │  • Accountant records payment → Student sees it  │      │
│  │  • Admission Officer approves → Student can login│      │
│  │  • Exam Coordinator publishes → Student views    │      │
│  │  • Principal views reports → Data is accurate    │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Rollback Plan

```
IF issues detected at any step:

1. Disable feature flag immediately
2. System reverts to previous behavior
3. No data loss (new data isolated)
4. Investigate root cause
5. Fix and re-test on staging
6. Re-enable feature flag when ready

ROLLBACK TIME: <5 minutes (feature flag toggle)
```

---

## 12. Timeline & Milestones

### 12.1 Detailed Timeline

```
┌─────────────────────────────────────────────────────────────┐
│              Detailed Timeline (10-12 Weeks)                 │
├─────┬───────────────────────────────────────────────────────┤
│Week │  Tasks                                                 │
├─────┼───────────────────────────────────────────────────────┤
│  1  │  • Deploy schema updates (User, new models)          │
│     │  • Seed permissions for priority roles               │
│     │  ✓ Milestone M1: Foundation Ready                    │
├─────┼───────────────────────────────────────────────────────┤
│  2  │  • Enhance auth controller (unified login)           │
│     │  • Add brute force protection                        │
│     │  • Start Accountant backend APIs                     │
├─────┼───────────────────────────────────────────────────────┤
│  3  │  • Complete Accountant backend APIs                  │
│     │  • Start Admission Officer backend APIs              │
│     │  • Begin Accountant frontend pages                   │
├─────┼───────────────────────────────────────────────────────┤
│  4  │  • Complete Admission Officer backend APIs           │
│     │  • Complete Accountant frontend pages                │
│     │  • Begin Admission Officer frontend pages            │
│     │  ✓ Milestone M2: Accountant Workflow Ready           │
├─────┼───────────────────────────────────────────────────────┤
│  5  │  • Start Exam Coordinator backend APIs               │
│     │  • Complete Admission Officer frontend pages         │
│     │  • Begin Principal backend APIs                      │
│     │  ✓ Milestone M3: Admission Officer Workflow Ready    │
├─────┼───────────────────────────────────────────────────────┤
│  6  │  • Complete Exam Coordinator backend APIs            │
│     │  • Complete Principal backend APIs                   │
│     │  • Begin Exam Coordinator frontend pages             │
├─────┼───────────────────────────────────────────────────────┤
│  7  │  • Continue Exam Coordinator frontend pages          │
│     │  • Begin Principal frontend pages                    │
├─────┼───────────────────────────────────────────────────────┤
│  8  │  • Complete Exam Coordinator frontend pages          │
│     │  • Continue Principal frontend pages                 │
│     │  ✓ Milestone M4: Exam Coordinator Workflow Ready     │
├─────┼───────────────────────────────────────────────────────┤
│  9  │  • Complete Principal frontend pages                 │
│     │  • Begin integration testing                         │
│     │  ✓ Milestone M5: Principal Workflow Ready            │
├─────┼───────────────────────────────────────────────────────┤
│  10 │  • Complete integration testing                      │
│     │  • Begin UAT with pilot colleges                     │
│     │  • Fix bugs from UAT                                 │
├─────┼───────────────────────────────────────────────────────┤
│  11 │  • Complete UAT                                      │
│     │  • Performance optimization                          │
│     │  • Security testing                                  │
├─────┼───────────────────────────────────────────────────────┤
│  12 │  • Production deployment preparation                 │
│     │  • Documentation finalization                        │
│     │  • Training material preparation                     │
│     │  ✓ Milestone M6: Production Ready                    │
└─────┴───────────────────────────────────────────────────────┘
```

### 12.2 Milestone Deliverables

| Milestone | Week | Deliverable | Success Criteria | Go/No-Go Decision |
|-----------|------|-------------|------------------|-------------------|
| **M1: Foundation Ready** | 1 | Schemas deployed, permissions seeded | Existing login works, new roles in enum | ✅ Proceed to API dev |
| **M2: Accountant Ready** | 4 | Full accountant workflow | Can record payments, generate receipts, view reports | ✅ Pilot with 1 college |
| **M3: Admission Officer Ready** | 5 | Full admission workflow | Can review, approve, reject applications | ✅ Pilot with 1 college |
| **M4: Exam Coordinator Ready** | 8 | Full exam workflow | Can create schedules, generate hall tickets, publish results | ✅ Pilot with 1 college |
| **M5: Principal Ready** | 9 | Principal dashboard & reports | Can view all reports, manage staff | ✅ Ready for UAT |
| **M6: Production Ready** | 12 | All roles tested, optimized, documented | UAT sign-off, zero critical bugs | ✅ Deploy to production |

---

## 13. Resource Requirements

### 13.1 Development Team

| Role | Count | Responsibilities | Time Allocation |
|------|-------|------------------|-----------------|
| **Backend Developer** | 2 | API development, models, middleware, services | Full-time (12 weeks) |
| **Frontend Developer** | 2 | React pages, components, state management | Full-time (8 weeks, starts Week 3) |
| **QA Engineer** | 1 | Testing (unit, integration, UAT), bug tracking | Part-time (4 weeks, starts Week 6) |
| **DevOps Engineer** | 0.5 | Deployment, feature flags, monitoring | Part-time (2 weeks total) |

### 13.2 Infrastructure

| Resource | Purpose | Cost Estimate |
|----------|---------|---------------|
| **Staging Server** | Testing migrations, new features | Already available |
| **Feature Flag Service** | Gradual rollout, kill switches | LaunchDarkly free tier / Custom |
| **Monitoring** | Error tracking, performance | Already available (Sentry) |
| **Email Service** | Invitation emails, receipts | Already configured |

### 13.3 Budget Summary

| Category | Estimate |
|----------|----------|
| Development (12 weeks) | ₹X,XX,XXX (internal cost) |
| Infrastructure | ₹X,XXX (minimal, existing infra) |
| Testing & QA | ₹XX,XXX (internal cost) |
| Documentation & Training | ₹XX,XXX (internal cost) |
| **Total** | **₹X,XX,XXX** |

---

## 14. Risk Mitigation

### 14.1 Risk Matrix

| Risk | Likelihood | Impact | Severity | Mitigation Strategy |
|------|:----------:|:------:|:--------:|---------------------|
| **Existing login breaks** | LOW | CRITICAL | 🔴 HIGH | Feature flags, extensive testing, immediate rollback capability |
| **Permission misconfiguration** | MEDIUM | HIGH | 🔴 HIGH | Permission validation scripts, role capability testing matrix |
| **Data inconsistency** | LOW | MEDIUM | 🟡 MEDIUM | Transactional operations, validation before save, audit logs |
| **Performance degradation** | LOW | MEDIUM | 🟡 MEDIUM | Query optimization, indexing, load testing before production |
| **User confusion with new UI** | MEDIUM | LOW | 🟡 MEDIUM | In-app guided tours, training videos, help documentation |
| **Email delivery failures** | LOW | LOW | 🟢 LOW | Test email service, fallback in-app notifications |

### 14.2 Contingency Plans

**Scenario 1: Existing Students/Teachers Cannot Login**
- **Immediate Action:** Disable `ENHANCED_AUTH` feature flag
- **Fallback:** Old auth method continues working
- **Timeline:** 5 minutes to restore
- **Root Cause Analysis:** Within 24 hours

**Scenario 2: Payment Recording Fails**
- **Immediate Action:** Disable accountant payment recording
- **Fallback:** Continue with existing payment methods
- **Timeline:** Immediate rollback
- **Fix:** Debug and re-test on staging

**Scenario 3: Exam Schedule Creation Errors**
- **Impact:** Low (new feature, no existing workflow affected)
- **Action:** Fix bug, re-deploy
- **Timeline:** 1-2 days

---

## 15. Success Metrics

### 15.1 Post-Implementation KPIs

| Metric | Current State | Target (After Implementation) | Measurement Method |
|--------|---------------|-------------------------------|-------------------|
| **Accountant payment recording time** | Manual (10-15 min/student) | <3 min/student | System logs |
| **Admission processing time** | 2-3 days/application | <1 day/application | System timestamps |
| **Exam schedule creation time** | Manual (Excel, 2-3 days) | <2 hours | User feedback |
| **Principal report generation time** | Manual compilation (1-2 days) | <5 minutes (auto-generated) | System logs |
| **User-related support tickets** | N/A (no system) | <5 per month | Support ticket system |
| **Role-based access errors** | N/A | 0 | Security audit logs |
| **Admin satisfaction** | N/A | >8/10 (survey) | Post-implementation survey |

### 15.2 Business Value

| Role | Business Value Delivered |
|------|-------------------------|
| **Accountant** | Faster payment collection, accurate financial records, reduced manual errors, better cash flow tracking |
| **Admission Officer** | Faster admission processing, reduced application backlog, better applicant experience, data-driven admission decisions |
| **Exam Coordinator** | Streamlined exam management, automated hall ticket generation, efficient results publishing, reduced administrative overhead |
| **Principal** | Real-time college oversight, data-driven decision making, staff management, comprehensive reporting |

### 15.3 ROI Estimate

| Metric | Value |
|--------|-------|
| Development cost | ₹X,XX,XXX |
| Monthly operational savings | ₹XX,XXX (reduced manual work, fewer errors) |
| Break-even point | ~6-8 months |
| Annual ROI | ~150-200% |

---

## 16. Next Steps

### Immediate Actions (Upon Approval)

1. ✅ **Management sign-off** on this implementation plan
2. ✅ **Resource allocation** (assign developers, QA, DevOps)
3. ✅ **Staging environment preparation** (copy production data, anonymize sensitive fields)
4. ✅ **Project kickoff meeting** with all stakeholders
5. ✅ **Week 1 sprint planning** (schema deployment, permission seeding)
6. ✅ **Set up project tracking** (Jira/Trello board, daily standups)

### Week 1 Checklist

- [ ] Deploy schema updates to staging
- [ ] Run permission seeding script
- [ ] Verify existing login still works
- [ ] Create new test users for each role
- [ ] Begin backend API development (Accountant)
- [ ] Daily progress updates to management

---

## Appendix A: Feature Flags Configuration

```javascript
// config/featureFlags.js
module.exports = {
  // Authentication
  ENHANCED_AUTH: process.env.ENHANCED_AUTH === 'true',
  
  // Role-based UI
  SHOW_ACCOUNTANT_UI: process.env.SHOW_ACCOUNTANT_UI === 'true',
  SHOW_ADMISSION_UI: process.env.SHOW_ADMISSION_UI === 'true',
  SHOW_EXAM_UI: process.env.SHOW_EXAM_UI === 'true',
  SHOW_PRINCIPAL_UI: process.env.SHOW_PRINCIPAL_UI === 'true',
  
  // Role APIs
  ENABLE_ACCOUNTANT_APIS: process.env.ENABLE_ACCOUNTANT_APIS === 'true',
  ENABLE_ADMISSION_APIS: process.env.ENABLE_ADMISSION_APIS === 'true',
  ENABLE_EXAM_APIS: process.env.ENABLE_EXAM_APIS === 'true',
  ENABLE_PRINCIPAL_APIS: process.env.ENABLE_PRINCIPAL_APIS === 'true',
  
  // Security
  ENABLE_BRUTE_FORCE_PROTECTION: process.env.ENABLE_BRUTE_FORCE_PROTECTION === 'true',
  ENABLE_LOGIN_TRACKING: process.env.ENABLE_LOGIN_TRACKING === 'true'
};
```

---

## Appendix B: Permission Seed Script

```javascript
// scripts/seed-priority-permissions.js
const Permission = require('../src/models/permission.model');

const priorityPermissions = [
  {
    role: 'ACCOUNTANT',
    permissions: [
      { resource: 'payments', actions: ['create', 'read', 'update'] },
      { resource: 'students', actions: ['read'] },
      { resource: 'receipts', actions: ['create', 'read'] },
      { resource: 'reports', actions: ['read'] }
    ]
  },
  {
    role: 'ADMISSION_OFFICER',
    permissions: [
      { resource: 'students', actions: ['create', 'read', 'update'] },
      { resource: 'admissions', actions: ['create', 'read', 'update'] },
      { resource: 'documents', actions: ['read'] },
      { resource: 'reports', actions: ['read'] }
    ]
  },
  {
    role: 'EXAM_COORDINATOR',
    permissions: [
      { resource: 'exams', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'results', actions: ['create', 'read', 'update'] },
      { resource: 'students', actions: ['read'] },
      { resource: 'teachers', actions: ['read'] }
    ]
  },
  {
    role: 'PRINCIPAL',
    permissions: [
      { resource: 'students', actions: ['read', 'update'] },
      { resource: 'teachers', actions: ['read', 'update'] },
      { resource: 'reports', actions: ['read'] },
      { resource: 'admissions', actions: ['read', 'update'] },
      { resource: 'notifications', actions: ['create', 'read'] }
    ]
  }
];

const seedPermissions = async () => {
  for (const perm of priorityPermissions) {
    await Permission.findOneAndUpdate(
      { role: perm.role },
      perm,
      { upsert: true, new: true }
    );
    console.log(`✅ Seeded permissions for ${perm.role}`);
  }
  console.log('✅ All priority permissions seeded successfully');
};

seedPermissions().catch(console.error);
```

---

## Appendix C: Environment Variables

```bash
# .env additions for priority roles

# Feature Flags
ENHANCED_AUTH=true
SHOW_ACCOUNTANT_UI=true
SHOW_ADMISSION_UI=true
SHOW_EXAM_UI=true
SHOW_PRINCIPAL_UI=true
ENABLE_ACCOUNTANT_APIS=true
ENABLE_ADMISSION_APIS=true
ENABLE_EXAM_APIS=true
ENABLE_PRINCIPAL_APIS=true
ENABLE_BRUTE_FORCE_PROTECTION=true
ENABLE_LOGIN_TRACKING=true

# Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
```

---

**Document Version:** 1.0  
**Last Updated:** April 9, 2026  
**Prepared By:** Development Team  
**Review Status:** Pending Management Approval  
**Implementation Start:** Upon Approval

---

*End of Document*
