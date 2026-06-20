# NOVAA ERP – Exception Management Sprint 3A Implementation Plan

## 1. Files to Modify

### Backend (1 file)
- `backend/src/controllers/timetableException.controller.js`

### Frontend (2 files)
- `frontend/src/pages/dashboard/Teacher/Timetable/ExceptionManagement.jsx`
- `frontend/src/pages/dashboard/HOD/HodExceptionApprovals.jsx`

---

## 2. Backend Plan — Exact API Changes

Only populated ObjectId references need new `.populate()` calls. Plain String/Date fields (`extraSlot.startTime`, `extraSlot.endTime`, `extraSlot.room`, `newRoom`) are returned automatically — no changes needed for those.

### 2.1 `substituteTeacher` population

Add `.populate("substituteTeacher", "name")` to 3 endpoints that currently omit it:

| Endpoint | Current populates (line refs) | Add after |
|---|---|---|
| `getMyExceptions()` | line 1772-1774 (approvedBy, rejectedBy, withdrawnBy) | add `.populate("substituteTeacher", "name")` |
| `getPendingApprovals()` | line 1713 (createdBy only) | add `.populate("substituteTeacher", "name")` |
| `getApprovalHistory()` | line 1874-1877 (createdBy + 3 action-by) | add `.populate("substituteTeacher", "name")` |

**`getExceptions()` already has this populate at line 680 — no change needed there.**

### 2.2 `rescheduledSlotId` population

Add `.populate("rescheduledSlotId", "day startTime endTime")` to all 4 endpoints:

| Endpoint | Insertion point |
|---|---|
| `getExceptions()` (line 668) | after existing slot_id populate block (after line 677) — insert `.populate("rescheduledSlotId", "day startTime endTime")` |
| `getMyExceptions()` (line 1762) | after extraSlot.teacher_id populate (or at end of chain before `.sort()`) |
| `getPendingApprovals()` (line 1703) | after slot_id populate block (after line 1711) |
| `getApprovalHistory()` (line 1864) | after slot_id populate block (after line 1872) |

### Summary of backend edits

```
File: backend/src/controllers/timetableException.controller.js

getExceptions()      — add rescheduledSlotId populate (after line 677)
getMyExceptions()    — add substituteTeacher populate, add rescheduledSlotId populate
getPendingApprovals() — add substituteTeacher populate, add rescheduledSlotId populate
getApprovalHistory() — add substituteTeacher populate, add rescheduledSlotId populate
```

No new imports needed. No new query params. No schema changes. No breaking changes to existing response shapes.

---

## 3. Frontend Plan — UI Changes

### 3.1 Teacher: ExceptionManagement.jsx

**Location:** Exception card rendering, inside the `.flex-grow-1` div, after the existing reason/rescheduled/rejected/withdrawn blocks (around line 710).

Insert a conditional "Exception Details" block that renders when any of these fields are relevant for the exception's type:

```
For EXTRA type (exc.type === "EXTRA" && exc.extraSlot):
  - Show: "Extra Slot: {extraSlot.startTime} – {extraSlot.endTime}"
  - Show: "Subject: {exc.slot_id?.subject_id?.name}" (already partially available)
  - Show: "Room: {extraSlot.room}" (if present)

For TEACHER_CHANGE (exc.type === "TEACHER_CHANGE" && exc.substituteTeacher):
  - Show: "Substitute Teacher: {exc.substituteTeacher.name}"

For ROOM_CHANGE (exc.type === "ROOM_CHANGE" && exc.newRoom):
  - Show: "New Room: {exc.newRoom}"

For RESCHEDULED (exc.rescheduledSlotId):
  - Show: "Rescheduled to: {exc.rescheduledSlotId.day}, {exc.rescheduledSlotId.startTime}–{exc.rescheduledSlotId.endTime}"

For status == "APPROVED" (add to existing approved block at line 633):
  - Show: "Approved by: {exc.approvedBy?.name}" (API returns {name} — already populated)

For status == "REJECTED":
  - Show: "Rejected by: {exc.rejectedBy?.name}" (API returns {name, email} — already populated)

For status == "WITHDRAWN":
  - Show: "Withdrawn by: {exc.withdrawnBy?.name}" (API returns {name, email} — already populated)
```

**Null-safety:** All new fields access nested properties with `?.` optional chaining. If `substituteTeacher` or `rescheduledSlotId` is not populated (e.g., a cached old response), `?.name` / `?.day` evaluates to `undefined` → hidden by the conditional.

**Mobile risk:** The card already uses flexbox with `flex-wrap`. Adding 3–4 small `<p className="small mb-0">` rows does not require layout changes. The existing card-body padding and max-width are sufficient.

### 3.2 HOD: HodExceptionApprovals.jsx

**Pending cards (`renderPendingCard`)** — add conditional detail rows in the `.flex-grow-1` section, after the existing `reason` block (line 413):

```
For TEACHER_CHANGE:
  - Show: "Substitute Teacher: {exc.substituteTeacher?.name}"

For ROOM_CHANGE:
  - Show: "New Room: {exc.newRoom}"

For EXTRA:
  - Show: "Extra Slot: {exc.extraSlot?.startTime} – {exc.extraSlot?.endTime}"
  - Show: "Room: {exc.extraSlot?.room}" (if present)

For RESCHEDULED:
  - Show: "Rescheduled Slot: {exc.rescheduledSlotId?.day}, {exc.rescheduledSlotId?.startTime}–{exc.rescheduledSlotId?.endTime}"
```

**History cards (`renderHistoryCard`)** — apply the same conditionals inside the `.flex-grow-1` section, after the reason block (line 602):

```
Same field extracts as above, keyed on exc.type
```

**Null-safety:** `exc.substituteTeacher?.name`, `exc.rescheduledSlotId?.day`, `exc.extraSlot?.startTime` — all use optional chaining. For `extraSlot`, the object exists only for EXTRA type exceptions; for other types it is `null`/`undefined`.

**Mobile risk:** The HOD card uses `row g-3` with `col-md-6 col-lg-3` fields. Adding new fields inside the existing reason box (`.mt-3 p-2 rounded`) keeps them inside the same responsive container — no breakpoint changes needed.

---

## 4. Null-Handling Requirements

| Field | Possible null reason | UI guard |
|---|---|---|
| `exc.approvedBy` | PENDING, REJECTED, WITHDRAWN exceptions | `exc.status === "APPROVED" && exc.approvedBy?.name` |
| `exc.rejectedBy` | PENDING, APPROVED, WITHDRAWN | `exc.status === "REJECTED" && exc.rejectedBy?.name` |
| `exc.withdrawnBy` | PENDING, APPROVED, REJECTED | `exc.status === "WITHDRAWN" && exc.withdrawnBy?.name` |
| `exc.substituteTeacher` | Not TEACHER_CHANGE type, or not yet populated by backend | `exc.type === "TEACHER_CHANGE" && exc.substituteTeacher?.name` |
| `exc.rescheduledSlotId` | Not RESCHEDULED type, or populated object missing `day` field | `exc.type === "RESCHEDULED" && exc.rescheduledSlotId?.day` |
| `exc.extraSlot` | Not EXTRA type | `exc.type === "EXTRA" && exc.extraSlot` |
| `exc.extraSlot.startTime/endTime` | EXTRA type but partially filled | `exc.extraSlot?.startTime && exc.extraSlot?.endTime` |
| `exc.newRoom` | Not ROOM_CHANGE type | `exc.type === "ROOM_CHANGE" && exc.newRoom` |

Note on stale cache / old API responses: If a user has the Teacher UI open and the backend is deployed with new populate calls before they refresh, the old response shape lacks `substituteTeacher.name` and `rescheduledSlotId.day`. Optional chaining renders nothing instead of crashing — acceptable degradation.

---

## 5. Regression Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **`substituteTeacher` population adds a join that is slow for large departments** | Low | Medium (slow load) | `substituteTeacher` is a single ref lookup per document; same pattern already used for `approvedBy`, `rejectedBy`, `withdrawnBy` — consistent with existing query shape |
| **`rescheduledSlotId` population returns `null` for records with no reschedule** | None (expected) | None | UI guards with `?.day` already handle null |
| **Frontend card height increases causing scroll jump** | Low | Low | Cards use `animate={{ opacity: 1, y: 0 }}` framer-motion on the outer div; extra content inside the card body doesn't trigger re-animation. Content appears after the card mounts. |
| **Old cached API responses without new populated fields cause invisible detail rows** | Medium (first deploy) | Low | Optional chaining shows nothing for missing fields — graceful degradation, not a crash |
| **`getMyExceptions` now performs more populate joins** | Low | Low | Same joins already exist in `getExceptions`; adding them to `getMyExceptions` is additive and consistent |
| **HOD pending cards show substitute teacher for non-TEACHER_CHANGE requests** | None | None | Conditional render `exc.type === "TEACHER_CHANGE"` prevents leakage |

---

## 6. Implementation Order

Execute in this sequence to isolate regressions and enable incremental verification:

### Step 1 — Backend: `rescheduledSlotId` population on all 4 endpoints
- Edit: `backend/src/controllers/timetableException.controller.js`
- Changes: 4 `.populate("rescheduledSlotId", "day startTime endTime")` insertions
- Verify: Call each endpoint via Postman/cURL; confirm `rescheduledSlotId` in response now has `{day, startTime, endTime}` instead of just `{"_id":"..."}`

### Step 2 — Backend: `substituteTeacher` population on 3 endpoints
- Edit: `backend/src/controllers/timetableException.controller.js`
- Changes: 3 `.populate("substituteTeacher", "name")` insertions (getMyExceptions, getPendingApprovals, getApprovalHistory)
- Verify: `getExceptions` already has it → confirm `getPendingApprovals` now returns `{name}` for substituteTeacher

### Step 3 — Frontend: Teacher ExceptionManagement.jsx — status actors
- Edit: `frontend/src/pages/dashboard/Teacher/Timetable/ExceptionManagement.jsx`
- Add: "Approved by {name}", "Rejected by {name}", "Withdrawn by {name}" lines inside existing status blocks
- Risk: Lowest — uses already-populated fields; no new conditionals on type

### Step 4 — Frontend: Teacher ExceptionManagement.jsx — type-specific details
- Edit: same file, same card render
- Add: extraSlot times, substituteTeacher name, newRoom, rescheduledSlotId details
- Risk: Moderate — new conditional blocks; test all 8 exception types

### Step 5 — Frontend: HOD HodExceptionApprovals.jsx — all detail fields
- Edit: `frontend/src/pages/dashboard/HOD/HodExceptionApprovals.jsx`
- Add: same detail fields in both `renderPendingCard` and `renderHistoryCard`
- Risk: Moderate — two render functions; verify both tabs

### Step 6 — End-to-end verification
- Create EXTRA, TEACHER_CHANGE, ROOM_CHANGE, RESCHEDULED exceptions as Teacher
- Verify fields appear in Teacher list
- Approve/reject as HOD
- Verify fields appear in HOD pending and history tabs
- Test withdrawal flow
- Test with PENDING exceptions (no action-by fields should appear)

---

## 7. Test Scenarios

### T1 — rescheduledSlotId population (backend)
- **Precondition:** PENDING RESCHEDULED exception exists with `rescheduledSlotId` set
- **Action:** `GET /api/timetable/{id}/exceptions`, `GET /api/timetable/exceptions/my`, `GET /api/timetable/exceptions/pending`, `GET /api/timetable/exceptions/history`
- **Assert:** `rescheduledSlotId` is an object with `day`, `startTime`, `endTime` in all 4 responses
- **Assert:** For non-RESCHEDULED exceptions, `rescheduledSlotId` is `null`

### T2 — substituteTeacher population (backend)
- **Precondition:** PENDING TEACHER_CHANGE exception exists
- **Action:** Same 4 GET calls
- **Assert:** `substituteTeacher` is `{name: "..."}` in all 4 responses
- **Assert:** For non-TEACHER_CHANGE exceptions, `substituteTeacher` is `null`

### T3 — Teacher UI — approvedBy display
- **Precondition:** APPROVED exception created by logged-in teacher
- **Action:** Navigate to Teacher ExceptionManagement
- **Assert:** Card shows "Approved by {HOD name}" below the approved date
- **Assert:** REJECTED card shows "Rejected by {HOD name}" and reason
- **Assert:** WITHDRAWN card shows "Withdrawn by {own name}" and reason

### T4 — Teacher UI — type-specific detail fields
- **Precondition:** One exception of each type exists: EXTRA, TEACHER_CHANGE, ROOM_CHANGE, RESCHEDULED
- **Action:** View each card in Teacher ExceptionManagement
- **Assert:** EXTRA shows time range and room
- **Assert:** TEACHER_CHANGE shows substitute teacher name
- **Assert:** ROOM_CHANGE shows new room
- **Assert:** RESCHEDULED shows day + time of target slot

### T5 — HOD UI — pending card detail fields
- **Precondition:** PENDING exceptions of each relevant type submitted by a teacher
- **Action:** HOD opens Exception Approvals → Pending tab
- **Assert:** TEACHER_CHANGE card shows substitute teacher name
- **Assert:** ROOM_CHANGE card shows new room
- **Assert:** EXTRA card shows extra slot times
- **Assert:** RESCHEDULED card shows target day/time

### T6 — HOD UI — history card detail fields
- **Precondition:** APPROVED / REJECTED / WITHDRAWN exceptions exist
- **Action:** HOD opens Exception Approvals → History tab
- **Assert:** Same type-specific details appear in history cards as in pending cards
- **Assert:** actionBy name still shown (existing behavior preserved)

### T7 — Null / edge-case handling
- **Precondition:** Exception with no substituteTeacher set (corrupt or partially-edited)
- **Action:** Render card
- **Assert:** No crash; substitute teacher line simply does not appear
- **Precondition:** Exception with `rescheduledSlotId` ObjectId that doesn't resolve
- **Assert:** `?.day` is undefined → rescheduled detail line hidden; no crash

### T8 — Regression: existing data integrity
- **Precondition:** Existing APPROVED/REJECTED/WITHDRAWN exceptions from before this deploy
- **Action:** Load all lists in Teacher and HOD UIs
- **Assert:** All previously visible fields still visible and correct
- **Assert:** No `undefined` literal strings appear in the UI

---

*End of plan. No code modified.*
