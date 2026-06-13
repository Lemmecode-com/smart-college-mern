# Timetable Exception Withdraw Workflow - Implementation Plan

## Objective

Introduce a Timetable Exception Withdraw Workflow so teachers cannot edit submitted exception requests.

Business flow after implementation:

1. Teacher creates an exception request.
2. Teacher may withdraw only their own `PENDING` exception.
3. If corrections are needed, teacher creates a new exception request.
4. HOD sees withdrawn requests in history, not in pending approvals.
5. Withdrawal is audited and notified.

---

## Current Baseline Findings

### Existing backend behavior

- `backend/src/models/timetableException.model.js`
  - Current statuses: `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`.
  - No withdrawal status or withdrawal metadata.
  - Existing exception queries usually filter `isActive: true`.

- `backend/src/controllers/timetableException.controller.js`
  - `createException` creates teacher exception requests.
  - `updateException` exists and is routed as HOD-only in the committed route file.
  - Current working tree has an unstaged change that appears to allow teacher updates for own pending exceptions; this should be reverted or ignored because it conflicts with the business requirement.
  - `approveException` and `rejectException` already audit and notify.

- `backend/src/routes/timetable.routes.js`
  - `PUT /api/timetable/exceptions/:exceptionId` is HOD-only.
  - No withdraw route exists.

- `backend/src/models/auditLog.model.js`
  - Has `TIMETABLE_EXCEPTION_CREATED`, `UPDATED`, `DELETED`, `APPROVED`, and `REJECTED`.
  - Does not include `TIMETABLE_EXCEPTION_WITHDRAWN`.

- `backend/src/services/timetableSchedule.service.js`
  - Loads active exceptions for schedule generation.
  - Existing schedule generation should be checked so withdrawn exceptions are excluded.
  - Consider filtering to effective statuses such as `APPROVED` and `COMPLETED` to avoid pending/withdrawn exceptions affecting the displayed schedule.

### Existing frontend behavior

- `frontend/src/pages/dashboard/Teacher/Timetable/ExceptionManagement.jsx`
  - Shows teacher exception list.
  - Currently has Edit and Delete actions for exceptions.
  - Edit navigates to `CreateException.jsx` with `location.state.editException`.

- `frontend/src/pages/dashboard/Teacher/Timetable/CreateException.jsx`
  - Supports create and edit mode.
  - Edit mode calls `PUT /timetable/exceptions/:id`.

- `frontend/src/pages/dashboard/HOD/HodExceptionApprovals.jsx`
  - Shows pending approvals and history.
  - History currently expects approved and rejected groups.
  - Needs withdrawn history support.

---

## 1. Database Changes

### Required changes

Add support for withdrawn exception records without deleting historical data.

### Schema-level changes

In `TimetableException`:

- Add `WITHDRAWN` to the `status` enum.
- Add withdrawal tracking fields:
  - `withdrawnBy`
  - `withdrawnAt`
  - `withdrawalReason`

### Index changes

Recommended indexes:

- Existing status index should cover `WITHDRAWN`.
- Add or update compound index for teacher history:
  - `{ college_id: 1, createdBy: 1, status: 1, exceptionDate: -1 }`
- Add or update compound index for withdrawn audit/history lookups:
  - `{ college_id: 1, status: 1, withdrawnAt: -1 }`

### Migration requirements

No destructive migration is required.

Recommended migration approach:

1. Deploy model/schema changes.
2. Let Mongoose create or update indexes if `autoIndex` is enabled.
3. If production uses controlled migrations, add a migration script under `backend/scripts/` to ensure indexes exist.
4. Do not backfill existing records as `WITHDRAWN`; existing records should keep their current status.
5. Existing `PENDING`, `APPROVED`, `REJECTED`, and `COMPLETED` records remain valid.

### Backward compatibility

- Adding a status enum value is additive.
- Adding nullable fields does not break existing records.
- Old API clients that do not send `withdrawalReason` should still be supported if the backend treats it as optional.
- Existing exception history remains readable.

---

## 2. Model Changes

### File affected

`backend/src/models/timetableException.model.js`

### Changes

Add fields under the approval/workflow section:

- `withdrawnBy`
  - Reference to `User`.
  - Optional.
  - Populated in UI where needed.

- `withdrawnAt`
  - Date.
  - Optional.

- `withdrawalReason`
  - String.
  - Trimmed.
  - Optional or required depending on product decision.
  - Recommended: optional with frontend prompt, backend accepts empty string as `"No reason provided"` or stores `null`.

### Status enum

Update status enum to include:

- `WITHDRAWN`

### Validation rules

Recommended model-level validation:

- If `status === "WITHDRAWN"`:
  - `withdrawnBy` should exist.
  - `withdrawnAt` should exist.
  - `withdrawalReason` should exist or explicitly be allowed as `null`.

- If `status !== "WITHDRAWN"`:
  - `withdrawnBy`, `withdrawnAt`, and `withdrawalReason` should remain untouched unless cleared intentionally.

### Instance method

Add an instance method for consistency with existing `approve`, `reject`, and `markCompleted` methods:

- `withdraw(userId, reason)`
  - Sets `status` to `WITHDRAWN`.
  - Sets `withdrawnBy`.
  - Sets `withdrawnAt`.
  - Sets `withdrawalReason`.
  - Saves the document.

### Static helpers

Optional but recommended:

- `findPendingApprovals` should remain `PENDING` only.
- `findByDateRange` should remain effective exceptions only, such as `APPROVED` and `COMPLETED`, and should not include `WITHDRAWN`.
- Add a helper if the codebase benefits from a central active/effective status list.

---

## 3. Controller Changes

### File affected

`backend/src/controllers/timetableException.controller.js`

### Add controller function

Add `withdrawException`.

### Route behavior

`PUT /api/timetable/exceptions/:exceptionId/withdraw`

### Authorization rules

The teacher can withdraw only when all conditions are true:

1. User role is `TEACHER`.
2. Exception belongs to the authenticated user's college.
3. Exception was created by the authenticated user.
4. Exception is `isActive: true`.
5. Exception status is `PENDING`.
6. Timetable is not archived.

HOD should not use withdraw. HOD should continue using approve/reject for pending requests.

### Controller flow

Recommended flow:

1. Extract `exceptionId`.
2. Extract optional `withdrawalReason`.
3. Find exception by:
   - `_id`
   - `college_id`
   - `createdBy`
   - `status: "PENDING"`
   - `isActive: true`
4. If not found, return one of:
   - `EXCEPTION_NOT_FOUND`
   - `EXCEPTION_NOT_PENDING`
   - `NOT_CREATOR`
5. Load related timetable.
6. Verify timetable is not archived using `assertTimetableMutable`.
7. Validate teacher profile belongs to the same department if department context is required.
8. Set:
   - `status = "WITHDRAWN"`
   - `withdrawnBy = req.user.id`
   - `withdrawnAt = new Date()`
   - `withdrawalReason = withdrawalReason || "No reason provided"`
9. Save the exception.
10. Invalidate timetable schedule cache.
11. Send HOD notification.
12. Create audit log asynchronously.
13. Return populated exception.

### Notification

Reuse existing `Notification` model.

Notify the department HOD when a teacher withdraws a pending exception.

Recommended notification fields:

- `title`: `Timetable Exception Request Withdrawn`
- `message`: include teacher name, exception type, date, and withdrawal reason.
- `type`: `ACADEMIC`
- `target`: `INDIVIDUAL`
- `target_users`: department HOD user ID
- `actionUrl`: `/hod/exception-approvals`

### Audit log

Create audit log with:

- `action`: `TIMETABLE_EXCEPTION_WITHDRAWN`
- `resourceType`: `TimetableException`
- `resourceId`: exception `_id`
- `oldValues`: `{ status: "PENDING" }`
- `newValues`: `{ status: "WITHDRAWN", withdrawalReason }`
- `metadata`: optional context such as timetable ID, exception date, exception type

### Existing controller adjustments

- Remove any teacher update capability from current unstaged changes.
- Keep HOD update route only if HOD administrative editing is still required.
- Ensure `getMyExceptions` returns `WITHDRAWN` records for the teacher.
- Ensure `getPendingApprovals` remains `PENDING` only.
- Ensure `getApprovalHistory` includes `WITHDRAWN` records for HOD history.
- Ensure duplicate exception checks do not treat `WITHDRAWN` as blocking a new exception.

### Race-condition handling

Withdraw and HOD approval/rejection can race on the same pending exception.

Recommended safeguards:

- Query `status: "PENDING"` when finding the exception.
- Recheck status immediately before saving.
- If status changed, return `409 CONFLICT` with code `EXCEPTION_ALREADY_PROCESSED`.
- Consider adding a version field later if true optimistic concurrency is required.

---

## 4. Route Changes

### File affected

`backend/src/routes/timetable.routes.js`

### Import change

Import `withdrawException` from `timetableException.controller`.

### Route to add

```text
PUT /api/timetable/exceptions/:exceptionId/withdraw
```

Recommended middleware:

1. `auth`
2. `role(ROLE.TEACHER)`
3. `collegeMiddleware`
4. `withdrawException`

### Route placement

Place the withdraw route with the other exception action routes:

- After `GET /api/timetable/exceptions/history`
- Before or after HOD approve/reject routes
- It does not conflict with `/:id/exceptions` because it has an additional `/withdraw` segment.

### Routes to keep

Keep existing routes:

- `POST /api/timetable/:id/exceptions`
- `POST /api/timetable/:id/exceptions/bulk`
- `GET /api/timetable/:id/exceptions`
- `GET /api/timetable/exceptions/my`
- `GET /api/timetable/exceptions/pending`
- `GET /api/timetable/exceptions/history`
- `PUT /api/timetable/exceptions/:exceptionId/approve`
- `PUT /api/timetable/exceptions/:exceptionId/reject`

### Routes to avoid for teachers

Teachers should not call:

- `PUT /api/timetable/exceptions/:exceptionId`
- `DELETE /api/timetable/exceptions/:exceptionId`
- `PUT /api/timetable/exceptions/:exceptionId/approve`
- `PUT /api/timetable/exceptions/:exceptionId/reject`

The frontend should remove teacher-facing edit/delete controls.

---

## 5. Audit Log Changes

### File affected

`backend/src/models/auditLog.model.js`

### Enum change

Add:

- `TIMETABLE_EXCEPTION_WITHDRAWN`

### Resource type

No change required because `TimetableException` already exists.

### Audit payload

When a teacher withdraws an exception:

- `userId`: teacher user ID
- `userEmail`: teacher email
- `userRole`: `TEACHER`
- `action`: `TIMETABLE_EXCEPTION_WITHDRAWN`
- `resourceType`: `TimetableException`
- `resourceId`: exception ID
- `method`: `PUT`
- `endpoint`: request original URL
- `oldValues`: previous status
- `newValues`: withdrawn status and withdrawal reason

### Backward compatibility

Adding an enum value is additive. Existing audit log records are unaffected.

---

## 6. Frontend Changes

## 6.1 Teacher Exception Management

### File affected

`frontend/src/pages/dashboard/Teacher/Timetable/ExceptionManagement.jsx`

### Remove teacher edit/delete behavior

Remove or disable:

- Edit button for all exceptions.
- Delete button for all exceptions.
- `handleDelete`.
- `handleConfirmDelete`.
- Delete confirmation modal.
- Navigation to edit mode in `CreateException.jsx`.

### Add withdraw behavior

Add withdraw action only when:

- `exc.status === "PENDING"`
- `exc.createdBy?._id` or populated creator matches current teacher
- If backend returns `canWithdraw`, use that field.

Recommended UI behavior:

- Show a Withdraw button for own pending exceptions.
- Open a confirmation modal.
- Ask for optional withdrawal reason.
- Call `PUT /api/timetable/exceptions/:exceptionId/withdraw`.
- On success:
  - Show toast.
  - Refresh exception list.
  - Remove the withdrawn request from pending count.

### Status display

Add status color for `WITHDRAWN`.

Recommended display:

- Label: `Withdrawn`
- Color: neutral gray or muted blue.
- Show:
  - Withdrawn date/time.
  - Withdrawal reason.
  - Withdrawn by, if populated.

### Pending count

Update pending count logic so `WITHDRAWN` is not counted.

### Import cleanup

Remove unused icons after removing edit/delete:

- `FaEdit`
- `FaTrash`

Keep icons needed for:

- Calendar
- Plus
- Info
- Check
- Times
- Warning
- Chevron
- Upload

---

## 6.2 Teacher Create Exception Page

### File affected

`frontend/src/pages/dashboard/Teacher/Timetable/CreateException.jsx`

### Remove edit mode

The page should become create-only.

Remove:

- `editException` from `location.state`.
- `isEditing` logic.
- Submit branch that calls `PUT /api/timetable/exceptions/:id`.
- Edit form initialization from existing exception.
- Edit-mode text such as `Edit Exception`.

### New behavior

If a user navigates with old edit state, redirect to:

```text
/timetable/exceptions
```

or show a message that editing is no longer allowed and a new request must be created.

### Submit behavior

Submit should always create a new exception:

```text
POST /api/timetable/:timetableId/exceptions
```

Button label:

- `Submit Exception Request`

Success message:

- `Exception request submitted for approval`

---

## 6.3 HOD Exception Approvals

### File affected

`frontend/src/pages/dashboard/HOD/HodExceptionApprovals.jsx`

### Pending tab

No change needed for pending list if backend keeps `getPendingApprovals` as `PENDING` only.

Withdrawn requests must not appear in pending approvals.

### History tab

Add support for withdrawn history.

Recommended history structure:

- Approved
- Rejected
- Withdrawn

Options:

1. Add a third section in the existing History tab.
2. Add a `withdrawn` sub-tab under History.

Recommended simpler approach:

- Keep one History tab.
- Show approved, rejected, and withdrawn sections.

### Status display

Add `WITHDRAWN` status color.

Show:

- Withdrawn date/time.
- Withdrawal reason.
- Withdrawn by teacher.

### Action buttons

For withdrawn records:

- Do not show Approve.
- Do not show Reject.
- Show a disabled or neutral state such as `Withdrawn`.

---

## 7. HOD Workflow Changes

### Backend HOD behavior

HOD should continue to manage pending exceptions with:

- Approve
- Reject

HOD should not withdraw teacher requests.

### HOD pending queue

`GET /api/timetable/exceptions/pending` should return only:

- `status: "PENDING"`
- `isActive: true`

### HOD history

`GET /api/timetable/exceptions/history` should include:

- Approved
- Rejected
- Withdrawn

Recommended response shape:

```json
{
  "approved": [],
  "rejected": [],
  "withdrawn": []
}
```

Alternative response shape:

```json
{
  "exceptions": [],
  "summary": {
    "approved": 0,
    "rejected": 0,
    "withdrawn": 0
  }
}
```

Choose one and update frontend consistently.

### HOD visibility

HOD should be able to see why a teacher withdrew a request.

This helps HOD distinguish:

- Teacher corrected and resubmitted.
- Teacher cancelled by mistake.
- Teacher withdrew because HOD discussion happened offline.

---

## 8. Permission Changes

### Current permission system

`backend/src/middlewares/role.middleware.js` currently supports role-based checks and optional permission-service checks.

`backend/src/services/permission.service.js` initializes default permissions.

### Required permission model

If permission-service checks are introduced for timetable exceptions, use a resource such as:

```text
timetable-exception
```

Recommended actions:

- `CREATE`
- `READ`
- `WITHDRAW`
- `APPROVE`
- `REJECT`
- `DELETE`

### Teacher permissions

Teacher should have:

- Create exception request.
- Read own exception requests.
- Withdraw own pending exception request.

Teacher should not have:

- Update submitted exception.
- Delete submitted exception.
- Approve exception.
- Reject exception.

### HOD permissions

HOD should have:

- Read department pending exceptions.
- Read department exception history.
- Approve pending exceptions.
- Reject pending exceptions.
- Delete exceptions if existing HOD delete behavior is retained.

HOD should not need withdraw.

### Backward compatibility

Existing routes use `role(...)` middleware. If no permission-service route checks are added, this change can be implemented without touching permission records.

If permission-service checks are added later, update `initializeDefaultPermissions` so new deployments receive the correct default permissions.

---

## 9. API Contract Changes

## 9.1 New withdraw endpoint

### Endpoint

```text
PUT /api/timetable/exceptions/:exceptionId/withdraw
```

### Auth

Required.

### Role

`TEACHER` only.

### Request body

```json
{
  "withdrawalReason": "Submitted by mistake. Creating a corrected request."
}
```

`withdrawalReason` should be optional.

### Success response

```json
{
  "success": true,
  "data": {
    "exception": {
      "_id": "...",
      "status": "WITHDRAWN",
      "withdrawnBy": "...",
      "withdrawnAt": "2026-06-12T07:30:00.000Z",
      "withdrawalReason": "Submitted by mistake. Creating a corrected request."
    }
  },
  "message": "Exception request withdrawn successfully"
}
```

### Error responses

| Status | Code | Meaning |
|---|---|---|
| 400 | `MISSING_REASON` | Only if backend makes withdrawal reason required. |
| 400 | `CANNOT_WITHDRAW` | Exception is not pending. |
| 400 | `ARCHIVED_TIMETABLE` | Timetable is archived. |
| 403 | `NOT_CREATOR` | Teacher is not the exception creator. |
| 403 | `UNAUTHORIZED_ROLE` | User is not a teacher. |
| 404 | `EXCEPTION_NOT_FOUND` | Exception does not exist. |
| 409 | `EXCEPTION_ALREADY_PROCESSED` | Exception was approved/rejected/withdrawn after it was loaded. |

## 9.2 Existing create endpoint

No contract change required.

```text
POST /api/timetable/:id/exceptions
```

After withdrawal, teacher creates a corrected request using this endpoint.

## 9.3 Existing update endpoint

```text
PUT /api/timetable/exceptions/:exceptionId
```

Should remain HOD-only or be deprecated for teacher use.

Teachers must not use this endpoint to edit submitted exceptions.

## 9.4 Existing delete endpoint

```text
DELETE /api/timetable/exceptions/:exceptionId
```

Should remain HOD-only if delete behavior is retained.

Teachers must not use this endpoint.

## 9.5 Get my exceptions

```text
GET /api/timetable/exceptions/my
```

Should include `WITHDRAWN` records for the authenticated teacher.

Frontend should show withdrawn records as historical entries.

## 9.6 Get approval history

```text
GET /api/timetable/exceptions/history
```

Should include withdrawn records.

Recommended response:

```json
{
  "success": true,
  "data": {
    "approved": [],
    "rejected": [],
    "withdrawn": []
  },
  "message": "Approval history fetched successfully"
}
```

## 9.7 Schedule/API compatibility

Any API that returns effective schedule exceptions should not include withdrawn exceptions.

Affected areas to verify:

- Date-wise schedule.
- Weekly teacher schedule.
- Student schedule.
- Timetable dashboard counts.
- Exception validation conflict checks.

---

## 10. Testing Plan

## 10.1 Backend controller/API tests

If a test framework is added, recommended stack:

- `jest`
- `supertest`

If no framework is added, create a temporary manual API test script under `backend/scripts/` and do not commit it unless useful.

### Withdraw success

Test:

- Teacher creates pending exception.
- Same teacher calls withdraw.
- Response is `200`.
- Exception status becomes `WITHDRAWN`.
- `withdrawnBy` equals teacher user ID.
- `withdrawnAt` exists.
- `withdrawalReason` is saved.
- Audit log action is `TIMETABLE_EXCEPTION_WITHDRAWN`.
- HOD notification is created.
- Schedule cache is invalidated.

### Teacher cannot withdraw another teacher's exception

Expect:

- `403`
- Code: `NOT_CREATOR`

### Teacher cannot withdraw non-pending exception

Test statuses:

- `APPROVED`
- `REJECTED`
- `COMPLETED`
- `WITHDRAWN`

Expect:

- `400`
- Code: `CANNOT_WITHDRAW` or `EXCEPTION_NOT_PENDING`

### Non-teacher cannot withdraw

Expect:

- `403`
- Code: `UNAUTHORIZED_ROLE` or `FORBIDDEN_ROLE`

### Archived timetable

Expect:

- `400`
- Code: `ARCHIVED_TIMETABLE`

### Race condition

Test sequence:

1. Teacher withdraws pending exception.
2. HOD approves same exception.
3. One succeeds.
4. Other returns conflict.

Expected:

- Only one terminal action succeeds.
- Other returns `409 EXCEPTION_ALREADY_PROCESSED`.

### Create after withdraw

Test:

- Teacher withdraws a pending exception.
- Teacher creates a new corrected exception for the same date/type.
- Creation succeeds because withdrawn exception should not block duplicates.

### HOD pending list

Test:

- Withdrawn exception does not appear in pending approvals.

### HOD history

Test:

- Withdrawn exception appears in history under withdrawn records.

### Schedule exclusion

Test:

- Withdrawn exception does not affect generated schedule.
- Pending exception behavior should be reviewed; ideally only approved/completed exceptions affect schedule.

## 10.2 Frontend tests

Manual or automated checks:

### Teacher Exception Management

Verify:

- Edit button is absent.
- Delete button is absent.
- Withdraw button appears only for own pending exceptions.
- Withdraw button is absent or disabled for approved, rejected, completed, and withdrawn exceptions.
- Withdraw modal asks for optional reason.
- Successful withdraw refreshes the list.
- Withdrawn status displays correctly.
- Pending count excludes withdrawn records.

### Create Exception

Verify:

- Page no longer supports edit mode.
- Submit button says `Submit Exception Request`.
- Submitting calls `POST /api/timetable/:id/exceptions`.
- Old edit navigation redirects or shows a clear message.

### HOD Exception Approvals

Verify:

- Pending tab does not show withdrawn requests.
- History tab shows withdrawn requests.
- Withdrawn records show withdrawal reason and date.
- Approve/Reject buttons are absent or disabled for withdrawn records.

## 10.3 Regression tests

Verify existing workflows still work:

- Create exception.
- View teacher exception list.
- HOD approve exception.
- HOD reject exception.
- HOD approval history.
- Bulk exception upload.
- Schedule generation.
- Teacher conflict validation.
- Room conflict validation.
- Cache invalidation after exception state changes.

## 10.4 Validation commands

Recommended commands after implementation:

Backend:

```text
npm run dev
```

Frontend:

```text
npm run lint
npm run build
```

If Jest/Supertest is added:

```text
npm test
```

---

## Dependencies

### Backend dependencies

Existing dependencies are sufficient.

Used modules:

- `TimetableException`
- `Timetable`
- `Teacher`
- `Department`
- `Notification`
- `AuditLog`
- `teacherService`
- `scheduleCache`
- `assertTimetableMutable`
- `AppError`
- `ApiResponse`

No new npm package is required unless adding automated tests.

### Frontend dependencies

Existing dependencies are sufficient.

Used modules:

- `AuthContext`
- Axios API client
- `ConfirmModal`
- `react-toastify`
- `framer-motion`
- `react-icons/fa`
- `react-router-dom`

No new npm package is required.

---

## Files Affected

### Backend

| File | Change |
|---|---|
| `backend/src/models/timetableException.model.js` | Add `WITHDRAWN` status and withdrawal fields |
| `backend/src/controllers/timetableException.controller.js` | Add `withdrawException`; update list/history behavior; remove teacher update behavior from working changes |
| `backend/src/routes/timetable.routes.js` | Add withdraw route |
| `backend/src/models/auditLog.model.js` | Add `TIMETABLE_EXCEPTION_WITHDRAWN` enum |
| `backend/src/services/timetableSchedule.service.js` | Ensure withdrawn exceptions are excluded from schedule generation |
| `backend/src/services/exceptionValidation.service.js` | Ensure withdrawn exceptions do not block duplicate/new exception creation |
| `backend/src/services/permission.service.js` | Optional: add default permissions if permission-service checks are introduced |

### Frontend

| File | Change |
|---|---|
| `frontend/src/pages/dashboard/Teacher/Timetable/ExceptionManagement.jsx` | Remove edit/delete; add withdraw for own pending exceptions; show withdrawn status |
| `frontend/src/pages/dashboard/Teacher/Timetable/CreateException.jsx` | Remove edit mode; create-only flow |
| `frontend/src/pages/dashboard/HOD/HodExceptionApprovals.jsx` | Show withdrawn history; exclude withdrawn from pending |
| `frontend/src/components/Sidebar/config/navigation.config.js` | No change expected |

### Tests/scripts

| File | Change |
|---|---|
| `backend/scripts/` | Optional migration or manual API test script |
| New backend test files | Optional if Jest/Supertest is added |

---

## Backward Compatibility Considerations

### API compatibility

- Existing create, approve, reject, and history endpoints should continue to work.
- Existing clients that do not know about `WITHDRAWN` can ignore new fields.
- Existing records do not need migration.
- Teacher edit is intentionally removed from the UI. Any client directly calling teacher edit will no longer be supported by design.

### Data compatibility

- Existing statuses remain valid.
- `WITHDRAWN` is additive.
- Old records without withdrawal fields remain valid.
- Withdrawn records remain `isActive: true` for audit/history visibility.

### UI compatibility

- Teacher users should no longer see edit/delete actions.
- HOD users should see withdrawn requests only in history.
- Students should not be affected because withdrawn exceptions should not affect effective schedules.

---

## Implementation Order

1. Backend model changes.
2. Backend audit enum change.
3. Backend route import and withdraw route.
4. Backend controller withdraw implementation.
5. Backend list/history adjustments.
6. Schedule/validation checks to exclude withdrawn exceptions.
7. Teacher frontend remove edit/delete.
8. Teacher frontend add withdraw modal/action.
9. Create exception page remove edit mode.
10. HOD approvals add withdrawn history.
11. Optional permission defaults.
12. Manual/API tests.
13. Frontend lint/build validation.

---

## Acceptance Criteria

- Teachers cannot edit submitted exception requests from the UI.
- Teachers can withdraw only their own pending exception requests.
- Teachers can create a new exception request after withdrawing.
- Withdrawn requests do not appear in HOD pending approvals.
- Withdrawn requests appear in HOD history.
- Withdrawn requests do not affect schedule generation.
- Withdrawal creates an audit log.
- HOD receives a withdrawal notification.
- Existing approve/reject workflows continue to work.
- Frontend builds successfully after changes.
