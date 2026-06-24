# NOVAA ERP – Notification Module Improvement Plan

## Priority Matrix

| Priority | Issue | Impact |
|----------|-------|--------|
| **Critical** | Mark-as-read route mismatch | Broken bulk notification clearing |
| **Critical** | Duplicate notification bypass | Race conditions, duplicate alerts |
| **High** | NotificationCard ignores actionUrl | Poor UX, broken deep-linking |
| **High** | Teacher sees all HOD notifications | Information leakage |
| **Medium** | HOD visibility missing targeted teacher notifs | Incomplete notification feed |
| **Medium** | Dashboard notification widgets absent | Users miss time-sensitive alerts |
| **Low** | Real-time via Socket.IO | Infrastructure change, high effort |

---

## 1. Critical – Fix Mark-Read Route Mismatch

**Current state:**
- Backend route: `POST /notifications/:id/mark-read` (`notification.routes.js:112`)
- Frontend single mark: `POST /notifications/${id}/mark-read` (`Navbar.jsx:215`) ✅ correct
- Frontend bulk mark-all: `POST /notifications/${n._id}/read` (`Navbar.jsx:245`) ❌ wrong

**Backend changes:**
- None required. Route already exists.

**Frontend changes:**
- `frontend/src/components/Navbar.jsx` line 245:
  - Change `api.post(\`/notifications/${n._id}/read\`)` → `api.post(\`/notifications/${n._id}/mark-read\`)`
- Verify `markAsRead` in Navbar uses correct route (it already does at line 215).

**Risks:**
- Low risk. Single-line fix in one file. Backend already handles the correct route.

**Test scenarios:**
- Click "Mark all read" → verify all notifications cleared from dropdown
- Click individual mark-read → verify single notification removed
- Verify count API (`/notifications/unread/bell`) updates after mark-read

---

## 2. Critical – Enforce Duplicate Prevention via Service Layer

**Current state:**
- `timetableException.controller.js` directly calls `Notification.create()` / `Notification.insertMany()` in 6 places (lines 308, 528, 1118, 1396, 1450, 1592)
- `leave.controller.js` directly calls `Notification.create()` in 3 places (lines 171, 385, 495)
- `studentApproval.controller.js` directly calls `Notification.create()` (line 576)
- `promotion.controller.js` directly calls `Notification.create()` (line 106)
- `paymentReminder.service.js` directly calls `Notification.create()` (line 129)
- `autoCloseSession.service.js` directly calls `Notification.create()` (line 135)
- `notification.service.js` already has deduplication methods (`sendExceptionToHod`, `sendExceptionApproval`, `sendExceptionRejection`, `sendExceptionWithdrawal`) that are **never called** by the exception controller.
- The unique compound index `idx_notification_dedupe` exists but partial filter only covers `target: "INDIVIDUAL"`, so broadcasts can still duplicate.

**Backend changes:**

### 2a. Refactor exception controller to use service methods

Replace all direct `Notification.create()` calls in `timetableException.controller.js` with `notificationService` calls:

| Location | Current | Replace with |
|----------|---------|--------------|
| createException (~L308) | `Notification.create({...actionUrl:"/hod/exception-approvals"...})` | `notificationService.sendExceptionToHod(collegeId, teacherId, hodUserId)` |
| createBulkExceptions (~L528) | `Notification.create({...actionUrl:"/hod/exception-approvals"...})` | `notificationService.sendExceptionToHod(...)` |
| withdrawException (~L1118) | `Notification.create({...actionUrl:"/hod/exception-approvals"...})` | `notificationService.sendExceptionWithdrawal(collegeId, teacherId, hodUserId, ...)` |
| approveException HOD notif (~L1396) | `Notification.create({...actionUrl:"/timetable/exceptions"...})` | `notificationService.sendExceptionApproval(collegeId, hodUserId, teacherUserId)` |
| approveException affected users (~L1450) | `Notification.insertMany(allUserIds.map(...))` | `notificationService.createNotifications(allUserIds.map(...))` (batch with dedup) |
| rejectException (~L1592) | `Notification.create({...actionUrl:"/timetable/exceptions"...})` | `notificationService.sendExceptionRejection(collegeId, hodUserId, teacherUserId, rejectionReason)` |

### 2b. Refactor leave controller to use service methods

Add to `notification.service.js`:
```js
async sendLeaveApplicationToHod(collegeId, teacherId, hodUserId, ...) { ... }
async sendLeaveApproval(collegeId, hodUserId, teacherUserId, ...) { ... }
async sendLeaveRejection(collegeId, hodUserId, teacherUserId, ...) { ... }
```

Then replace direct calls in `leave.controller.js`.

### 2c. Extend unique index for better deduplication

Update `notification.model.js` unique index to cover non-INDIVIDUAL targets:
```js
notificationSchema.index(
  {
    college_id: 1,
    createdByRole: 1,
    target: 1,
    target_department: 1,
    target_course: 1,
    target_semester: 1,
    title: 1,
    createdAt: 1
  },
  {
    name: "idx_notification_dedupe_v2",
    unique: true,
    partialFilterExpression: { isActive: true }
  }
)
```

Or, keep existing index and rely on service-layer `notificationExists()` pre-check before create.

### 2d. Audit remaining direct Notification.create() calls

| File | Line | Action |
|------|------|--------|
| `studentApproval.controller.js` | 576 | Add `sendAdmissionStatusNotification()` to service, call it |
| `promotion.controller.js` | 106 | Already has `sendPromotionNotification` controller method, but it still calls `Notification.create()` directly — move to service |
| `paymentReminder.service.js` | 129 | Add `sendPaymentReminderNotification()` to service, call it |
| `autoCloseSession.service.js` | 135 | Add `sendSessionClosedNotification()` to service, call it |

**Risks:**
- Medium risk. Requires careful migration of async fire-and-forget blocks. Must ensure error handling remains graceful (notification failures should not break main flow).
- Bulk `insertMany` for affected users in `approveException` currently uses `ordered: false` implicitly? No, it doesn't. Need to add `{ ordered: false }` for atomic partial success.

**Test scenarios:**
- Rapidly create 3 exceptions for same slot → verify only 1 notification sent
- Teacher creates exception → withdraw immediately → verify HOD receives withdrawal, not duplicate "new request"
- Bulk exception creation → verify HOD gets single notification if duplicates exist
- Leave apply + approve + reject workflows → verify exactly 2 notifications per lifecycle (one each direction)

---

## 3. High – NotificationCard Should Use actionUrl

**Current state:**
- `NotificationCard.jsx` hardcodes navigation at lines 143-145:
  ```js
  const notificationPath = window.location.pathname.includes("/teacher/")
    ? `/teacher/notifications/view/${note._id}`
    : `/notification/view/${note._id}`;
  navigate(notificationPath);
  ```
- It never reads `note.actionUrl`.
- `handleCardClick` fires on card click AND the "View Details" button click (line 479-482 calls `handleCardClick(e)` again after `e.stopPropagation()`).

**Frontend changes:**
- `frontend/src/components/NotificationCard.jsx`:
  - Replace `handleCardClick` logic:
    ```js
    const handleCardClick = (e) => {
      if (e.target.closest(".card-action-btn")) return;
      const target = note.actionUrl || (window.location.pathname.includes("/teacher/")
        ? `/teacher/notifications/view/${note._id}`
        : `/notification/view/${note._id}`);
      navigate(target);
    };
    ```
  - For the "View Details" button, navigate directly to `note.actionUrl || viewRoute` instead of calling `handleCardClick(e)` which double-handles.
  - Pass `actionUrl` through to `NotificationDetails.jsx` if it also needs deep-linking.

**Risks:**
- Low risk. Fallback to existing behavior if `actionUrl` is missing.
- Need to verify `NotificationListPage.jsx` ROLE_CONFIG `viewRoute` is no longer hardcoded when `actionUrl` exists.

**Test scenarios:**
- Notification with `actionUrl: "/hod/exception-approvals"` → clicking card navigates to exception approvals
- Notification without `actionUrl` → falls back to `/notification/view/:id` or `/teacher/notifications/view/:id`
- Edit/Delete buttons still work (stopPropagation preserved)

---

## 4. High – Teacher Notification Visibility: Only Relevant HOD Notifications

**Current state:**
- `getTeacherNotifications` (controller line 319-327):
  ```js
  {
    college_id: req.college_id,
    isActive: true,
    $or: [
      { createdByRole: "COLLEGE_ADMIN" },
      { createdByRole: "HOD" },  // ← ALL HOD notifications, no user filter
      { target: "INDIVIDUAL", target_users: userId }
    ]
  }
  ```
- This exposes every HOD broadcast to every teacher, even if targeted to a specific individual or department the teacher is not in.

**Backend changes:**
- `backend/src/controllers/notification.controller.js` — `getTeacherNotifications`:
  - Replace bare `{ createdByRole: "HOD" }` with role-aware targeting:
    ```js
    { createdByRole: "HOD", $or: [
      { target: "INDIVIDUAL", target_users: userId },
      { target: "ALL" },
      { target: "TEACHERS" },
      { target: "DEPARTMENT", target_department: teacher.department_id },
      { target: "COURSE", target_course: teacher.course_id },
      { target: "SEMESTER", target_semester: teacher.currentSemester }
    ]}
    ```
  - Need to load teacher's department, course, semester first (like `getStudentNotifications` does).
  - Similarly fix `getTeacherNotificationCount` and `getUnreadForBell` (TEACHER branch).

**Frontend changes:**
- `frontend/src/components/NotificationListPage.jsx` — teacher ROLE_CONFIG `secondaryNotesKey` is `"hodNotifications"`. After the fix, this will correctly only contain relevant HOD notifs. No frontend change needed unless we want to rename "From HOD" to "Department Notices" etc.

**Risks:**
- Medium risk. Requires teacher profile lookup (department, course, semester). Adds query complexity. Existing exception notifications use `target: "INDIVIDUAL"` so they will still be visible to the intended teacher.
- If HOD has been broadcasting with `target: "ALL"`, teachers will continue to see them (by design).

**Test scenarios:**
- Teacher A creates exception → HOD sends approval notification targeting INDIVIDUAL to Teacher A → Teacher B does NOT see it
- HOD creates `target: "DEPARTMENT"` notification for CS department → all CS teachers see it, other departments do not
- HOD creates `target: "ALL"` → all teachers see it

---

## 5. Medium – HOD Notification Visibility: Targeted Teacher Notifications

**Current state:**
- `getHodNotifications` (controller line 274-282):
  ```js
  {
    college_id: req.college_id,
    isActive: true,
    $or: [
      { createdByRole: "COLLEGE_ADMIN" },
      { createdByRole: "HOD", createdBy: userObjectId },
      { target: "INDIVIDUAL", target_users: userId }
    ]
  }
  ```
- This does NOT include teacher notifications targeted to `DEPARTMENT`, `COURSE`, or `SEMESTER` that include the HOD's department.
- Currently, exception approval/rejection notifications from HOD → teacher use `target: "INDIVIDUAL"`, so they appear in teacher views but NOT in HOD's own notification list (which is fine — HOD doesn't need to see their own sent notifications as incoming).
- However, if a teacher creates a notification targeted to `DEPARTMENT: CS`, the HOD of CS should ideally see it. Currently they do not.

**Backend changes:**
- `backend/src/controllers/notification.controller.js` — `getHodNotifications`:
  - Add department-aware teacher notification filter:
    ```js
    { createdByRole: "TEACHER", $or: [
      { target: "INDIVIDUAL", target_users: userId },
      { target: "DEPARTMENT", target_department: hodDepartmentId },
      { target: "ALL" },
      { target: "TEACHERS" }
    ]}
    ```
  - Similarly fix `getHodNotificationCount` and `getUnreadForBell` (HOD branch).
  - Load HOD's department from Teacher/Department model.

**Risks:**
- Medium risk. Similar profile lookup requirement. Minimal impact on existing exception workflow.

**Test scenarios:**
- Teacher creates `target: "DEPARTMENT"` notification → HOD of that department sees it
- Teacher creates `target: "INDIVIDUAL"` to HOD → HOD sees it
- Teacher creates `target: "STUDENTS"` → HOD does NOT see it

---

## 6. Medium – Dashboard Notification Widgets

**Current state:**
- `TeacherDashboard.jsx`: No notification widget. Only stats, quick actions, recent lectures.
- `HodDashboard.jsx`: No notification widget. Only KPIs, quick actions, recent timetables, department info.

**Frontend changes:**

### Teacher Dashboard
- Add "Pending Approvals" KPI card showing `getTeacherNotificationCount` with breakdown:
  - `hodCount` (exception approvals pending)
  - `adminCount` (general admin notifications)
- Add "Recent Notifications" mini-widget (3-5 latest unread) using `getUnreadForBell`.
- Click notification → navigate to `note.actionUrl` or `/teacher/notifications`.

### HOD Dashboard
- Add "Pending Actions" KPI card showing `getHodNotificationCount` with breakdown:
  - `teacherCount` (new exception requests from teachers)
  - `adminCount`
- Add "Recent Notifications" mini-widget (3-5 latest unread) using `getUnreadForBell`.
- Click notification → navigate to `note.actionUrl` or `/notification/view`.

**Backend changes:**
- Ensure `/dashboard/teacher` and `/dashboard/hod` endpoints already include notification counts. If not, add them.
- If dashboard endpoints don't include counts, add new lightweight endpoints or reuse existing count endpoints.

**Risks:**
- Low risk. Widget is additive, doesn't change existing behavior.
- Performance: `getUnreadForBell` already has `limit(20)` and optimized queries.

**Test scenarios:**
- Teacher with pending exception → dashboard shows "1 Pending Approval" card linking to exception approvals
- Teacher with no notifications → dashboard shows "No pending actions" empty state
- HOD with new exception request → dashboard shows notification card with teacher name and date

---

## 7. Low – Evaluate Real-Time Notifications

**Current state:**
- Polling: `NotificationListPage.jsx` polls every 30s (`CONFIG.AUTO_REFRESH_INTERVAL`).
- Navbar polls count every 30s (`Navbar.jsx:310-313`).
- No WebSocket/Socket.IO implementation exists in the project.

**Evaluation:**

| Aspect | Polling (Current) | Socket.IO (Proposed) |
|--------|-------------------|---------------------|
| Setup effort | None (already working) | High — requires server setup, auth middleware for sockets, reconnection logic |
| Battery/Data | ~1 request/30s per active tab | Persistent connection, but event-driven (lower aggregate traffic) |
| Latency | Up to 30s delay | Sub-second |
| Reliability | Simple, works offline-ish | Requires stable connection, fallback to polling needed |
| Complexity | Low | Medium-High |
| Scale | Fine for <1000 concurrent users | Better for large scale |

**Recommendation:**
- **Defer Socket.IO to v2.** Current 30s polling is acceptable for an ERP system. Notifications are not real-time-critical (approvals, announcements).
- If real-time is needed later, implement with:
  1. `socket.io` on backend with JWT auth middleware
  2. Join rooms by `collegeId` + `role` for targeted broadcasts
  3. Fallback to polling if socket disconnected
  4. Use existing `getUnreadForBell` count as initial state on socket connect

**Risks:**
- Low risk for deferral. No action needed now.

---

## Implementation Order

| Sprint | Tasks | Priority |
|--------|-------|----------|
| **Sprint 1** | Fix mark-read route mismatch (Navbar.jsx) | Critical |
| **Sprint 1** | Refactor exception controller → notification.service.js | Critical |
| **Sprint 1** | Refactor leave controller → notification.service.js | Critical |
| **Sprint 1** | Update unique index for broader deduplication | Critical |
| **Sprint 2** | NotificationCard.jsx uses actionUrl | High |
| **Sprint 2** | Teacher visibility fix (filter HOD notifications by target) | High |
| **Sprint 3** | HOD visibility fix (include department-targeted teacher notifications) | Medium |
| **Sprint 3** | Migrate studentApproval, promotion, paymentReminder, autoCloseSession to service | Medium |
| **Sprint 4** | Teacher Dashboard notification widget | Medium |
| **Sprint 4** | HOD Dashboard notification widget | Medium |
| **Sprint 5** | Socket.IO evaluation POC (optional) | Low |

---

## Backend Changes Summary

| File | Change |
|------|--------|
| `backend/src/controllers/notification.controller.js` | Fix `getTeacherNotifications`, `getTeacherNotificationCount`, `getHodNotifications`, `getHodNotificationCount`, `getUnreadForBell` to filter by role-appropriate targeting |
| `backend/src/controllers/timetableException.controller.js` | Replace 6 direct `Notification.create/insertMany` with `notificationService` calls |
| `backend/src/controllers/leave.controller.js` | Replace 3 direct `Notification.create` with `notificationService` calls; add 3 new service methods |
| `backend/src/controllers/studentApproval.controller.js` | Use `notificationService` for admission status notification |
| `backend/src/controllers/promotion.controller.js` | Use `notificationService` for promotion notification |
| `backend/src/services/notification.service.js` | Add: `sendLeaveApplicationToHod`, `sendLeaveApproval`, `sendLeaveRejection`, `sendAdmissionStatusNotification`, `sendPromotionNotification` (move from controller), `sendPaymentReminderNotification`, `sendSessionClosedNotification` |
| `backend/src/models/notification.model.js` | Update unique index to cover all target types (not just INDIVIDUAL) |
| `backend/src/routes/notification.routes.js` | No changes needed (route already correct) |

---

## Frontend Changes Summary

| File | Change |
|------|--------|
| `frontend/src/components/Navbar.jsx` | Fix bulk mark-all route: `/read` → `/mark-read` (line 245) |
| `frontend/src/components/NotificationCard.jsx` | Use `note.actionUrl` for navigation when available |
| `frontend/src/components/NotificationListPage.jsx` | No structural change needed after backend visibility fix |
| `frontend/src/pages/dashboard/Teacher/TeacherDashboard.jsx` | Add notification KPI card + recent notifications widget |
| `frontend/src/pages/dashboard/HOD/HodDashboard.jsx` | Add notification KPI card + recent notifications widget |

---

## Risks

1. **Service migration risk**: Exception and leave controllers use fire-and-forget `(async () => { ... })()` blocks. Swapping to service methods must preserve this pattern to avoid blocking the main response.
2. **Query performance**: Adding `$or` conditions with department/course/semester lookups to notification queries may slow down. Mitigate with existing indexes on `target_department`, `target_course`, `target_semester`.
3. **Backward compatibility**: Teachers who relied on seeing ALL HOD notifications may lose visibility of broad-targeted ones. This is intentional for security.
4. **Dashboard load time**: Adding notification widgets increases dashboard payload. Use existing count endpoints (already optimized with `countDocuments`) and bell endpoint (already `limit(20)`).

---

## Test Scenarios

### Critical
1. **Mark-all-read**: Open notification bell, click "Mark all read" → dropdown clears, count = 0
2. **Single mark-read**: Click X on one notification → that one removed, count decremented
3. **Duplicate exception**: Teacher creates exception, withdraws immediately → HOD receives exactly 1 notification (withdrawal, not duplicate "new request")
4. **Duplicate leave**: Teacher applies for leave, then applies for same dates again → only 1 leave application notification sent to HOD

### High
5. **actionUrl navigation**: Admin sends notification with `actionUrl: "/timetable/list"` → clicking card navigates to timetable list
6. **actionUrl fallback**: Notification without `actionUrl` → navigates to default view page
7. **Teacher visibility**: HOD sends `target: "DEPARTMENT"` notification to CS → CS teachers see it, non-CS teachers do not
8. **Teacher individual visibility**: HOD sends `target: "INDIVIDUAL"` to Teacher A → Teacher B does not see it

### Medium
9. **HOD visibility**: Teacher sends `target: "DEPARTMENT"` to CS → CS HOD sees it in notification list
10. **Dashboard widget**: Teacher with 2 pending approvals sees "2 Pending" card on dashboard
11. **Dashboard widget click**: Clicking dashboard notification navigates to correct `actionUrl`

### Low
12. **Polling resilience**: Disable network → re-enable → notifications refresh on next poll cycle

---

## Recommended Sprint Breakdown

### Sprint 1 (Critical) — ~3 days
- Fix Navbar mark-all-read route
- Refactor exception controller (6 locations) → notification.service.js
- Refactor leave controller (3 locations) → notification.service.js
- Add leave service methods
- Update notification model unique index
- Run existing `notification-visibility.test.js` to verify no regressions

### Sprint 2 (High) — ~2 days
- NotificationCard actionUrl navigation
- Fix teacher notification visibility query (add department/course/semester awareness)
- Update teacher notification count and bell queries

### Sprint 3 (Medium) — ~2 days
- Fix HOD notification visibility query
- Migrate studentApproval, promotion, paymentReminder, autoCloseSession to service layer
- Update HOD notification count and bell queries

### Sprint 4 (Medium) — ~3 days
- Teacher Dashboard notification widget
- HOD Dashboard notification widget
- End-to-end UI testing

### Sprint 5 (Low) — Optional
- Socket.IO proof-of-concept if real-time requirement emerges
