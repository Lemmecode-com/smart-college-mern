# Timetable Exception Module Migration Analysis

## Executive Summary

Migration from: HOD creates and auto-approves exceptions  
Migration to: Teacher creates requests → HOD approves/rejects

---

## 1. Database Impact

### 1.1 Schema Analysis - `timetableException.model.js`

**Current State:**
- Schema already has `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED` status enum (line 55)
- `default: "PENDING"` is set for status (line 56) ✓
- All approval fields exist: `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason` ✓
- All required validation in pre-save hook exists for APPROVED/REJECTED states ✓

**Required Changes:**
- **None** - Schema is already compatible with the target workflow

### 1.2 Index Analysis

Existing indexes fully support the migration:
- `{ college_id, status, exceptionDate }` - covers pending approvals query
- `{ status: 1 }` - covers status-based queries
- All other indexes remain valid

### 1.3 Data Migration

- No DB migrations required
- Existing APPROVED exceptions remain unaffected (created before this change)
- Existing PENDING exceptions (from testing) become actionable

---

## 2. Controller Changes - `timetableException.controller.js`

### 2.1 Critical Changes Required

| # | Function | Line | Current Issue | Required Change |
|---|----------|------|---------------|----------------|
| C1 | `createException` | 214 | `status: "APPROVED"` - auto-approves | Change to `status: "PENDING"` |
| C2 | `createException` | 222-223 | Sets `approvedBy`/`approvedAt` | Remove - approval happens later |
| C3 | `createBulkExceptions` | 369 | `status: "APPROVED"` - auto-approves | Change to `status: "PENDING"` |
| C4 | `createBulkExceptions` | 376-377 | Sets `approvedBy`/`approvedAt` | Remove - approval happens later |
| C5 | `updateException` | 506+ | Only HOD can update (line 538) | All TEACHERs can edit own PENDING exceptions |
| C6 | `deleteException` | 619+ | Only HOD can delete (line 650) | All TEACHERs can delete own PENDING exceptions |

### 2.2 New Authorization Logic Required

**`updateException` changes:**
- Find exception and check ownership (`createdBy === user.id`)
- Allow if: HOD of department OR (TEACHER and own exception and PENDING status)
- Prevent editing if status is APPROVED/REJECTED/COMPLETED

**`deleteException` changes:**
- Find exception and check ownership (`createdBy === user.id`)
- Allow if: HOD of department OR (TEACHER and own exception and PENDING status)

### 2.3 New Endpoints Required

| Endpoint | Purpose | Handler |
|----------|---------|---------|
| `GET /api/timetable/exceptions/my` | Teacher views own requests | New function - filter by `createdBy` |
| `GET /api/timetable/exceptions/history` | HOD views approval history | New function - filter APPROVED/REJECTED |

### 2.4 Existing Endpoints - Authorization Changes

| Endpoint | Current Auth | Required Auth |
|----------|--------------|---------------|
| `createException` | HOD only (lines 51-60) | Any TEACHER (can create for own department's timetables) |
| `createBulkExceptions` | HOD only (lines 285-296) | Any TEACHER |
| `approveException` | TEACHER (any) → HOD check inside | HOD only (already checks HOD status) |
| `rejectException` | TEACHER (any) → HOD check inside | HOD only (already checks HOD status) |
| `updateException` | HOD only | HOD OR TEACHER (own PENDING only) |
| `deleteException` | HOD only | HOD OR TEACHER (own PENDING only) |

---

## 3. Route Changes - `timetable.routes.js`

### 3.1 Current Routes (lines 200-271)

| Route | Current Role | Action |
|-------|--------------|--------|
| `/exceptions/pending` | `ROLE.HOD` | Get Pending Approvals ✓ (correct) |
| `/:id/exceptions` | `ROLE.TEACHER` | Create single - **CHANGE NEEDED** |
| `/:id/exceptions/bulk` | `ROLE.TEACHER` | Create bulk - **CHANGE NEEDED** |
| `/:id/exceptions` | Mixed roles | Get exceptions - OK for teachers |
| `/exceptions/:exceptionId` | `ROLE.TEACHER` | Update - **CHANGE NEEDED** |
| `/exceptions/:exceptionId` | `ROLE.TEACHER` | Delete - **CHANGE NEEDED** |
| `/exceptions/:exceptionId/approve` | `ROLE.TEACHER` | Approve - OK (internal check) |
| `/exceptions/:exceptionId/reject` | `ROLE.TEACHER` | Reject - OK (internal check) |

### 3.2 Required Route Changes

1. Remove `hod` middleware from create routes (lines 211-226)
2. Update `updateException` and `deleteException` routes to allow TEACHER role with updated controller logic
3. Add new routes:
   ```javascript
   // Teacher's own requests
   router.get("/exceptions/my", auth, role("TEACHER"), collegeMiddleware, getMyExceptions);
   
   // HOD approval history
   router.get("/exceptions/history", auth, role("HOD"), collegeMiddleware, getApprovalHistory);
   ```

---

## 4. UI Changes

### 4.1 Teacher-Side Changes - `ExceptionManagement.jsx`

**Current Issues:**
- HOD role check prevents access (line 1118): `if (user.role !== "TEACHER") return <Navigate...>`
- UI shows approve/reject buttons for ALL exceptions (lines 707-752)
- No distinction between own requests and department requests

**Required Changes:**
1. **Remove HOD redirect** - Allow both TEACHER and HOD roles, but with different views
2. **Add filtering logic:**
   - TEACHER: Show only own exceptions (filter by `createdBy`)
   - HOD: Show only department's exceptions
3. **Update action buttons based on status and ownership:**
   - PENDING: Show edit/delete only for owner; show approve/reject for HOD
   - APPROVED/REJECTED: Show view-only (no edit/delete)
4. **Update "Create Exception" flow:**
   - Show success message: "Request submitted for HOD approval" instead of immediate success
5. **Add new route for HOD approvals page** (separate component)

### 4.2 New HOD UI - `HodExceptionApprovals.jsx`

Create new page at `frontend/src/pages/dashboard/HOD/HodExceptionApprovals.jsx`:
- Fetch pending approvals via `GET /api/timetable/exceptions/pending`
- Display pending exception cards with approve/reject actions
- Include re-approval history view

### 4.3 Navigation Changes - `navigation.config.js`

**Teacher navigation (lines 478-496):**
- Keep existing "Add Exception" and "Exceptions" menu items
- Update icons/labels if needed for clarity

**HOD navigation (lines 1142-1167):**
- Add new section after timetable:
  ```javascript
  {
    id: "hod-exceptions",
    title: "Exception Approvals",
    icon: FaExclamationTriangle,
    defaultOpen: true,
    items: [
      {
        path: "/hod/exception-approvals",
        icon: FaClock,
        label: "Pending Approvals",
        exact: true,
      },
    ],
  }
  ```

### 4.4 App.jsx Route Changes

Add new route after line 975:
```jsx
<Route
  path="/hod/exception-approvals"
  element={
    <ProtectedRoute allowedRoles={["HOD"]}>
      <HodExceptionApprovals />
    </ProtectedRoute>
  }
/>
```

---

## 5. Security Implications

### 5.1 Current Security Model

1. **Authentication:** JWT via `auth.middleware` ✓
2. **Role-based access:** Via `role.middleware` ✓
3. **HOD verification:** Via `hod.middleware` (checks `department.hod_id`) ✓
4. **College isolation:** Via `college.middleware` ✓

### 5.2 Required Security Changes

| Threat | Mitigation |
|--------|------------|
| Teacher creates for wrong department | Validate timetable belongs to teacher's department via `teacher.department_id` |
| Teacher edits other's PENDING exception | Check `exception.createdBy === req.user.id` |
| Teacher deletes APPROVED exception | Block deletion if status !== PENDING |
| Teacher approves own request | Verify requesting HOD is not the creator (check `exception.createdBy`) |
| Cross-college data access | All queries already filter by `college_id` ✓ |
| IDOR on exception ID | All controllers use `_id + college_id` compound query ✓ |

### 5.3 New Security Functions Needed

```javascript
// In teacher service or controller
exports.validateTeacherDepartmentAccess = async (teacherId, timetableId, collegeId) => {
  const timetable = await Timetable.findOne({ _id: timetableId, college_id: collegeId });
  const teacher = await Teacher.findOne({ user_id: teacherId, college_id: collegeId });
  return teacher.department_id.toString() === timetable.department_id.toString();
}
```

---

## 6. Migration Strategy

### Phase 1: Backend Core Changes (High Risk)

| Step | Action | File | Risk |
|------|--------|------|------|
| 1.1 | Change `status: "APPROVED"` → `"PENDING"` in `createException` | controller:214 | Medium - affects creation flow |
| 1.2 | Remove `approvedBy`/`approvedAt` from creation | controller:222-223 | Medium |
| 1.3 | Change `status: "APPROVED"` → `"PENDING"` in `createBulkExceptions` | controller:369 | Medium |
| 1.4 | Remove `approvedBy`/`approvedAt` from bulk creation | controller:376-377 | Medium |
| 1.5 | Update `updateException` for ownership check | controller:506+ | High - authorization change |
| 1.6 | Update `deleteException` for ownership check | controller:619+ | High - authorization change |
| 1.7 | Add audit logs for all actions | controller | Low |
| 1.8 | Add notifications for status changes | controller | Low |

### Phase 2: API Layer (Medium Risk)

| Step | Action | File | Risk |
|------|--------|------|------|
| 2.1 | Remove `hod` middleware from create routes | routes:211-226 | Medium |
| 2.2 | Add `getMyExceptions` endpoint | routes, controller | Low |
| 2.3 | Add `getApprovalHistory` endpoint | routes, controller | Low |

### Phase 3: HOD UI (Low Risk)

| Step | Action | File | Risk |
|------|--------|------|------|
| 3.1 | Create `HodExceptionApprovals.jsx` component | new file | Low |
| 3.2 | Add route in `App.jsx` | App.jsx | Low |
| 3.3 | Add navigation item | navigation.config.js | Low |

### Phase 4: Teacher UI (Low Risk)

| Step | Action | File | Risk |
|------|--------|------|------|
| 4.1 | Update `ExceptionManagement.jsx` role check | line 1118 | Low |
| 4.2 | Add status-based action filtering | lines 707-798 | Low |
| 4.3 | Update toast messages for pending state | line 189-192 | Low |

---

## 7. Key Implementation Decisions

### 7.1 Teacher Access to Timetables

**Decision:** Teachers can only create exceptions for timetables in their department.

**Validation in `createException`:**
- Get teacher's department via `teacherService.getTeacherWithValidation()`
- Get timetable's department via `Timetable.findOne({ _id, college_id })`
- Compare: `teacher.department_id === timetable.department_id`
- Allow both TEACHER and HOD roles to create

### 7.2 HOD Cannot Approve Own Requests

**Decision:** HOD who creates exception cannot approve it.

**Implementation:**
- In `approveException` and `rejectException`, check:
  ```javascript
  if (exception.createdBy.toString() === req.user.id.toString()) {
    throw new AppError("Cannot approve own exception request", 403);
  }
  ```

### 7.3 Approval History

**Decision:** Separate endpoint for HOD to view approval history.

- `GET /api/timetable/exceptions/history` - returns APPROVED/REJECTED for HOD's department
- Could integrate into `HodExceptionApprovals.jsx` as a tab

---

## 8. Testing Considerations

1. **Unit Tests Required:**
   - Teacher can create exception for own department ✓
   - Teacher cannot create for other department
   - Teacher can edit own PENDING exception
   - Teacher cannot edit own APPROVED exception
   - Teacher can delete own PENDING exception
   - Teacher cannot delete own APPROVED exception
   - HOD can approve pending exception
   - HOD cannot approve own exception request

2. **Integration Tests Required:**
   - Full workflow: Teacher creates → HOD approves → Schedule updated
   - Full workflow: Teacher creates → HOD rejects → Teacher notified

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing APPROVED exceptions break | None | None | Only NEW exceptions get PENDING |
| Teachers confused by PENDING status | Medium | Medium | Update UI messaging |
| HOD gets wrong notifications | Low | Medium | Add `target_users` array for individual targeting |
| Race condition on edit/delete | Low | Low | Use transaction or optimistic locking |
| Cache invalidation issues | Low | Low | Already handled via `scheduleCache.invalidateTimetable()` |