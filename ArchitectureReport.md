Marks, ATKT & Promotion System — Architecture Document

**Status**: Planning / Pre-implementation  
**Last Updated**: June 2026  
*
---

1. What Exists Today

Promotion System (built, partially buggy)
- `PromotionPolicy` model — college-level only, no `course_id`
- `PromotionHistory` model — records each promotion event
- `promotion.controller.js` — gates promotion on fee + attendance only, no marks check
- Bugs confirmed in current code:
  - `isFinalYear` uses `maxSemester - 1` (off by one)
  - `getStudentPromotionDetails` hardcodes `maxSemester = 8` instead of reading from course
  - `validateAttendanceOverride` logic is inverted — blocks override for `NOT_ELIGIBLE`, only allows for `ATTENDANCE_NOT_AVAILABLE`

Exam Module (placeholder only)
- `exam.routes.js` — entire router locked to `EXAM_COORDINATOR` role only
- `exam.controller.js` — single placeholder returning `"Exam module coming in V1.1"`
- No `StudentMarks` model exists anywhere in the codebase
- No `SemesterResult` model exists anywhere in the codebase

Feature Flags (built, unwired)
- `FeatureFlag` model — has `enabledForColleges[]`, `enabledForUsers[]`, `rolloutPercentage`
- Currently only used for `PLATFORM_SUPPORT_*` dashboard features
- No controller checks a feature flag before allowing any business operation
- The infrastructure is correct — the wiring to business logic is missing

Known Schema Constraints (hardcoded, need fixing)
- `student.model.js` — `currentSemester: { min: 1, max: 8 }` hardcoded
- `course.model.js` — `durationSemesters: { max: 8 }` hardcoded
- `subject.model.js` — `semester: { max: 8 }` hardcoded, not tied to `course.durationSemesters`

---

2. Layered Architecture — The Plan

Three independently shippable layers. Each layer builds on the previous. Do not skip layers.

```
Layer 3 — Backlog Clearance (re-attempt marks entry, clear KTs)
    ↑ depends on Layer 2
Layer 2 — ATKT Policy (count FAILs vs maxAllowedKTs, conditional promotion)
    ↑ depends on Layer 1
Layer 1 — Pass/Fail Gate (teacher declares result per subject, SemesterResult stored)
    ↑ foundation — no dependencies
```

Layer 1 is universal — every college gets it.  
Layer 2 (ATKT) is opt-in — Super Admin enables per college via feature flag.  
Layer 3 (Backlog clearance) depends on Layer 2 being active.

---

3. Finalized Product Decisions (Q1–Q4)

These four decisions are final. They are not open for re-discussion. All model designs and API designs below reflect them.

---

Decision 1 — Who enters marks and who locks results

**Final**: Teacher enters marks for their own assigned subjects only (enforced via `Subject.teacher_id`). Exam Coordinator reviews and locks the result per subject per semester.

**Lock/Unlock workflow**:
- Once an Exam Coordinator locks a subject-result, no further edits are allowed by the teacher
- Exam Coordinator (or College Admin as fallback) can unlock a locked subject-result for correction
- Every lock action must write an audit log entry: actor, timestamp, action (`RESULT_LOCKED`)
- Every unlock action must write an audit log entry: actor, timestamp, reason (required), action (`RESULT_UNLOCKED`)
- Unlock reason is mandatory — minimum 10 characters, same pattern as attendance override reason

**Role access matrix**:

| Action | TEACHER | EXAM_COORDINATOR | COLLEGE_ADMIN |
|--------|---------|-----------------|---------------|
| Enter marks (bulk, per-subject) | Own subjects only | Any subject | No |
| Edit marks (before lock) | Own subjects only | Any subject | No |
| Edit marks (after lock) | No | Via unlock workflow | Via unlock workflow |
| Lock result | No | Yes | No |
| Unlock result | No | Yes | Yes (fallback) |
| View all results | Own subjects | All | All |

**Impact on `exam.routes.js`**: The current router-level `role(ROLE.EXAM_COORDINATOR)` lock must be removed. Each route gets its own role middleware. Marks entry routes allow `TEACHER` and `EXAM_COORDINATOR`. Lock/unlock routes allow `EXAM_COORDINATOR` and `COLLEGE_ADMIN`.

---

Decision 2 — Marks entry UX flow

**Final**: Primary flow is per-subject bulk entry. Secondary flow is per-student edit for corrections.

**Primary flow — per-subject bulk entry**:
- Teacher opens one subject → sees a table of all enrolled students for that subject → enters marks for all students in one pass → submits
- API: `POST /marks/subject/:subjectId/bulk` — accepts array of `{ student_id, internalMarks, externalMarks }`
- Available to: TEACHER (own subjects), EXAM_COORDINATOR (any subject)
- Available only while result is unlocked

**Secondary flow — per-student edit**:
- Opens a single student's marks record for a specific subject → edit individual fields → save
- API: `PUT /marks/:markId` — updates a single `StudentMarks` record
- Available to: TEACHER (own subjects, before lock), EXAM_COORDINATOR and COLLEGE_ADMIN (after unlock)
- Every edit after unlock must reference the unlock audit log entry

---

Decision 3 — Internal/External marks configuration

**Final**: Configurable per subject via `Subject.subjectType`.

**Subject types**:
- `THEORY` — has both `internalMaxMarks` and `externalMaxMarks` with independent pass thresholds
- `PRACTICAL` — internal marks only (`externalMaxMarks` is null or 0)
- `COMPOSITE` — both internal and external, but treated as a single combined assessment

**Pass/fail calculation rules**:
- `THEORY`: student must pass internal AND external independently. Failing either = subject FAIL, regardless of total
- `PRACTICAL`: only `internalMarks` evaluated. `externalMaxMarks` being null or 0 must not cause divide-by-zero or false failure — the engine skips external evaluation entirely when `externalMaxMarks` is null or 0
- `COMPOSITE`: total marks evaluated against a single `passMarks` threshold — no independent internal/external pass requirement

**Fields added to `Subject` model**:
```
subjectType         → enum: THEORY | PRACTICAL | COMPOSITE  (required)
internalMaxMarks    → Number (required for THEORY and COMPOSITE, null for PRACTICAL)
externalMaxMarks    → Number (required for THEORY and COMPOSITE, null for PRACTICAL)
internalPassMarks   → Number (required for THEORY, null for PRACTICAL and COMPOSITE)
externalPassMarks   → Number (required for THEORY, null for PRACTICAL and COMPOSITE)
passMarks           → Number (used for COMPOSITE and PRACTICAL as the single threshold)
```

**Validation rule**: when `subjectType === PRACTICAL`, the marks engine must check `externalMaxMarks === null || externalMaxMarks === 0` before attempting any external marks calculation. If true, skip external evaluation entirely.

---

Decision 4 — Pass criteria source of truth and precedence

**Final**: `Subject.passMarks` (and `internalPassMarks`, `externalPassMarks` for THEORY) is the source of truth, set once at subject setup.

**Precedence rule (unambiguous lookup order for the pass/fail engine)**:

```
1. Subject.internalPassMarks / Subject.externalPassMarks / Subject.passMarks
   → If set on the subject, use these. This is the primary source.

2. PromotionPolicy.minPassMarks (college-level default)
   → Used ONLY if Subject.passMarks is null or 0.
   → This is the fallback, not the override.

3. Hard-coded default: 35
   → Used only if neither Subject.passMarks nor PromotionPolicy.minPassMarks is set.
   → This should never happen in production — treat as a safety net only.
```

**This precedence rule must be implemented as a single utility function** — not inline logic scattered across controllers. Location: `backend/src/utils/passMarkResolver.js`. Every place in the codebase that needs to determine pass marks calls this function. No exceptions.

---

4. Layer 1 — Pass/Fail Gate

What it does
Teacher enters marks per subject per student via bulk table entry. System computes PASS/FAIL per subject using the pass criteria precedence rule above. A `SemesterResult` record is created per student per semester summarising all subject outcomes.

StudentMarks model (final schema)

```
StudentMarks {
  student_id          → ref Student, required
  college_id          → ref College, required
  subject_id          → ref Subject, required
  semester            → Number, required
  academicYear        → String, required (e.g. "2024-2025")

  internalMarks       → Number, nullable (null if subjectType is PRACTICAL with no internal)
  externalMarks       → Number, nullable (null if subjectType is PRACTICAL)
  totalMarks          → Number, computed (internalMarks + externalMarks, or just internalMarks for PRACTICAL)

  internalMaxMarks    → Number, snapshot from Subject at time of entry
  externalMaxMarks    → Number, snapshot from Subject at time of entry (null for PRACTICAL)
  passMarks           → Number, snapshot from resolved pass criteria at time of entry
  internalPassMarks   → Number, snapshot (null for PRACTICAL and COMPOSITE)
  externalPassMarks   → Number, snapshot (null for PRACTICAL and COMPOSITE)

  isPassed            → Boolean, computed by pass/fail engine
  failReason          → String, nullable (e.g. "INTERNAL_FAIL", "EXTERNAL_FAIL", "TOTAL_FAIL")

  isBacklog           → Boolean, default false (true for Layer 3 re-attempt entries)
  originalMarkId      → ref StudentMarks, nullable (points to original failed entry for backlog)

  enteredBy           → ref User, required
  enteredAt           → Date, required
  lastEditedBy        → ref User, nullable
  lastEditedAt        → Date, nullable
}
```

**Index**: `{ college_id, subject_id, semester, academicYear }` — primary query pattern for bulk entry  
**Index**: `{ student_id, semester, academicYear }` — for per-student result lookup  
**Unique**: `{ student_id, subject_id, semester, academicYear, isBacklog }` — prevents duplicate entries

SemesterResult model (final schema)

```
SemesterResult {
  student_id          → ref Student, required
  college_id          → ref College, required
  course_id           → ref Course, required
  semester            → Number, required
  academicYear        → String, required

  subjects: [
    {
      subject_id      → ref Subject
      markId          → ref StudentMarks
      isPassed        → Boolean
      failReason      → String, nullable
    }
  ]

  totalSubjects       → Number
  passedSubjects      → Number
  failedSubjects      → Number

  overallResult       → enum: PASS | FAIL | ATKT  (ATKT populated in Layer 2)

  isLocked            → Boolean, default false
  lockedBy            → ref User, nullable
  lockedAt            → Date, nullable

  unlockedBy          → ref User, nullable
  unlockedAt          → Date, nullable
  unlockReason        → String, nullable

  declaredBy          → ref User, required
  declaredAt          → Date, required
}
```

**Unique**: `{ student_id, semester, academicYear }` — one result record per student per semester

Pass/fail engine rules (from Decision 3)

```
function evaluateSubjectResult(marks, subject):
  if subject.subjectType === THEORY:
    internalPassed = marks.internalMarks >= subject.internalPassMarks
    externalPassed = marks.externalMarks >= subject.externalPassMarks
    isPassed = internalPassed AND externalPassed
    failReason = !internalPassed ? "INTERNAL_FAIL" : !externalPassed ? "EXTERNAL_FAIL" : null

  if subject.subjectType === PRACTICAL:
    if subject.externalMaxMarks === null OR subject.externalMaxMarks === 0:
      isPassed = marks.internalMarks >= resolvedPassMarks(subject)
      failReason = !isPassed ? "TOTAL_FAIL" : null
    else:
      isPassed = marks.totalMarks >= resolvedPassMarks(subject)
      failReason = !isPassed ? "TOTAL_FAIL" : null

  if subject.subjectType === COMPOSITE:
    isPassed = marks.totalMarks >= resolvedPassMarks(subject)
    failReason = !isPassed ? "TOTAL_FAIL" : null
```

Promotion controller change (Layer 1 gate)
After Layer 1 is built, `promoteStudent` adds a third gate after fee and attendance:
- Load `SemesterResult` for `student.currentSemester` and `student.currentAcademicYear`
- If `overallResult === FAIL` → block promotion with error `MARKS_INSUFFICIENT`
- If no `SemesterResult` exists → behaviour controlled by Q7 (still open — see Section 10)

Lock/Unlock audit log entries required
When a result is locked: write `AuditLog` with `action: RESULT_LOCKED`, `resourceType: SemesterResult`  
When a result is unlocked: write `AuditLog` with `action: RESULT_UNLOCKED`, `resourceType: SemesterResult`, `metadata: { reason }`

---

5. Layer 2 — ATKT Policy

What it does
On top of Layer 1 pass/fail data, apply ATKT rules. A student with 1–N failed subjects may still be promoted conditionally (with backlogs) if the college's ATKT policy allows it.

Feature flag gate
Flag name: `ATKT_MODULE`  
Controlled by: SUPER_ADMIN via existing `platformSupport.controller.js` `toggleFeature` endpoint  
Stored in: `FeatureFlag` collection, `enabledForColleges[]` array  

Before any ATKT logic runs, the promotion controller must call:
```
checkFeatureFlag("ATKT_MODULE", collegeId)
```
If flag is not enabled for this college → treat all FAILs as hard blocks (Layer 1 behaviour only).

PromotionPolicy changes needed (gap #24)
Add to `promotionPolicy.model.js`:
- `course_id` — optional ref to Course. If present, this policy applies to that course only.
- `maxAllowedKTs` — Number. Max failed subjects allowed for conditional promotion.
- `minPassMarks` — Number. College-level default pass marks (fallback per Decision 4 precedence rule).

Fallback logic: if no course-specific policy exists, fall back to college-level policy.

PromotionPolicy versioning (gap #25)
Current `pre('save')` hook deactivates all previous policies — no history kept.  
Fix: instead of deactivating, mark old policy as `supersededBy: new_policy_id`. Keep full history queryable.

Student model changes needed
Add to `student.model.js`:
- `activeBacklogs` — Number (count of currently uncleared KTs)
- `promotionStatus` — enum: `CLEAR | ATKT | DETAINED`

ATKT promotion flow
1. Check `ATKT_MODULE` feature flag for college
2. Load course-specific `PromotionPolicy` (fallback to college-level)
3. Count failed subjects from `SemesterResult`
4. If `failCount <= maxAllowedKTs` → promote with `promotionStatus: ATKT`, set `activeBacklogs = failCount`
5. If `failCount > maxAllowedKTs` → block promotion, set `promotionStatus: DETAINED`
6. Record in `PromotionHistory` with ATKT details

---

6. Layer 3 — Backlog Clearance

### What it does
A student with `activeBacklogs > 0` can re-attempt failed subjects. New marks are entered with `isBacklog: true`. If they pass, `activeBacklogs` decrements. When `activeBacklogs === 0`, `promotionStatus` changes to `CLEAR`.

### What needs to be built
- Backlog exam scheduling (links to `SemesterResult` failed subjects)
- Marks re-entry for backlog subjects (new `StudentMarks` record with `isBacklog: true`, `originalMarkId` pointing to original failed entry)
- `SemesterResult` update when backlog is cleared
- `student.activeBacklogs` decrement on clearance
- Notification to student on clearance

### Dependencies
- Layer 1 must be complete (`SemesterResult`, `StudentMarks` models)
- Layer 2 must be complete (`activeBacklogs` field on Student, ATKT policy)

---

7. Frontend — Current State and Conflicts

What exists on the frontend today

| File | What it does | Conflict with new system? |
|------|-------------|--------------------------|
| `ExamCoordinator/ExamDashboard.jsx` | Placeholder "Under Development" alert with quick links | No conflict — needs to be replaced entirely |
| `College-Admin/AddSubject.jsx` | Create subject form — fields: name, code, semester, credits, teacher, department, course | **CONFLICT** — no `subjectType`, `internalMaxMarks`, `externalMaxMarks`, `passMarks` fields |
| `College-Admin/EditSubject.jsx` | Edit subject form — same fields as AddSubject | **CONFLICT** — same missing fields |
| `College-Admin/ViewSubject.jsx` | View subject detail — displays name, code, semester, credits, teacher, department | **CONFLICT** — no marks config fields displayed |
| `College-Admin/SystemSetting/PromotionSetting.jsx` | Promotion policy form — fields: `minAttendancePercentage`, `scopedSemesters`, `effectiveFrom`, `isActive` | **CONFLICT** — no `maxAllowedKTs`, `minPassMarks`, `course_id` fields. Semester chips hardcoded to 8 semesters |
| `api/promotion.js` | API calls for promotion — `getPromotionPolicy`, `updatePromotionPolicy` | Partial conflict — policy API will gain new fields, existing calls still valid but incomplete |

No frontend exists yet for
- Marks entry (bulk per-subject table)
- Per-student marks edit
- SemesterResult view / lock / unlock
- Exam Coordinator marks review workflow
- ATKT status display on student profile
- Backlog clearance workflow

Sidebar navigation — Exam Coordinator
`navigation.config.js` has a single `EXAM_COORDINATOR` section with one item pointing to `/dashboard/exam` (the placeholder). The section is titled "Exam Planning" and currently links to shared pages (students, teachers, timetable). This entire section needs to be rebuilt when the exam module is built.

---

8. Frontend Changes Required (per layer)

Layer 1 frontend work

**Subject model changes (AddSubject, EditSubject, ViewSubject)**  
All three pages need `subjectType`, `internalMaxMarks`, `externalMaxMarks`, `internalPassMarks`, `externalPassMarks`, `passMarks` fields added.  
- `AddSubject.jsx` — add a "Marks Configuration" section after the existing Subject Details section. Show/hide internal/external fields based on selected `subjectType`
- `EditSubject.jsx` — add same fields. Currently a minimal form — needs the marks config section
- `ViewSubject.jsx` — add marks config display to the Subject Information card

**New pages needed — Teacher role**
- `Teacher/Marks/EnterMarks.jsx` — subject selector → bulk marks entry table → submit
- `Teacher/Marks/MySubjectResults.jsx` — list of subjects with lock status

**New pages needed — Exam Coordinator role**
- `ExamCoordinator/Marks/ReviewMarks.jsx` — view submitted marks per subject, lock/unlock controls
- `ExamCoordinator/Marks/SubjectResultList.jsx` — list all subjects with lock status for a semester

**PromotionSetting.jsx changes**
- Add `maxAllowedKTs` field (shown only when ATKT_MODULE flag is enabled for the college)
- Add `minPassMarks` field
- Add `course_id` selector for course-specific policies
- Fix hardcoded semester chips — generate from selected course's `durationSemesters` instead of fixed 8

Layer 2 frontend work
- Super Admin: toggle `ATKT_MODULE` flag per college (existing `platformSupport` UI may need a dedicated ATKT section)
- College Admin: `PromotionSetting.jsx` ATKT fields (gated behind flag check)
- Student profile: show `promotionStatus`, `activeBacklogs` count

Layer 3 frontend work
- Backlog exam scheduling page (Exam Coordinator)
- Backlog marks entry page (Teacher / Exam Coordinator)
- Student portal: backlog status and clearance history

---

9. Existing Bugs to Fix Before Building

These bugs exist in current code and will conflict with the new system if not fixed first.

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `promotion.controller.js` | `isFinalYear` uses `maxSemester - 1` | Change to `>= maxSemester` |
| 4 | `promotion.controller.js` | `getStudentPromotionDetails` hardcodes `maxSemester = 8` | Read from `student.course_id.durationSemesters` |
| 5 | `promotion.controller.js` | `validateAttendanceOverride` logic inverted | Fix condition: allow override for `NOT_ELIGIBLE` with reason, block without reason |
| 8 | `student.model.js` | `currentSemester: { max: 8 }` hardcoded | Remove max constraint or make dynamic |
| 9 | `course.model.js` | `durationSemesters: { max: 8 }` hardcoded | Raise to 12 or remove cap |
| 10 | `subject.model.js` | `semester: { max: 8 }` hardcoded | Tie to course's `durationSemesters` or raise cap |
| 11 | `exam.routes.js` | Entire router locked to `EXAM_COORDINATOR` | Move role check to per-route level |

---

10. AuditLog Gaps to Fix

| # | Field | Missing Values | Fix |
|---|-------|---------------|-----|
| 12 | `action` enum | `EXAM_CREATED`, `MARKS_SUBMITTED`, `RESULT_PUBLISHED`, `RESULT_LOCKED`, `RESULT_UNLOCKED` | Add to enum |
| 13 | `resourceType` enum | `Exam`, `Marks`, `SemesterResult` | Add to enum |
| 14 | `userRole` enum | `EXAM_COORDINATOR`, `ADMISSION_OFFICER`, `ACCOUNTANT`, `PRINCIPAL`, `PARENT_GUARDIAN` | Add to enum |

---

11. Feature Flag Wiring — What Needs to Be Built

### New utility: `passMarkResolver.js`
Location: `backend/src/utils/passMarkResolver.js`  
Implements the three-level precedence rule from Decision 4. Called by the pass/fail engine — never inline.

### New utility: `checkFeatureFlag(flagName, collegeId)`
Location: `backend/src/utils/featureFlag.util.js`

Logic:
1. Find flag by `name`
2. If not found → return `false`
3. If `enabled === true` (globally on) → return `true`
4. If `enabledForColleges` includes `collegeId` → return `true`
5. Otherwise → return `false`

### Seed `ATKT_MODULE` flag
Add to `permission.service.js` `initializePlatformSupportFeatures`:
```
{
  name: "ATKT_MODULE",
  description: "Enables ATKT/KT conditional promotion for a college",
  enabled: false,
  enabledForColleges: []
}
```

### Super Admin API
Existing `POST /platform-support/features/toggle` already handles this.  
No new endpoint needed — just seed the flag and it becomes toggleable.

---

12. Build Order (Strict Sequence)

```
Step 1  — Fix existing bugs (#1, #4, #5, #8, #9, #10, #11)
Step 2  — Fix AuditLog enums (#12, #13, #14) — add RESULT_LOCKED, RESULT_UNLOCKED
Step 3  — Add marks config fields to Subject model + update AddSubject, EditSubject, ViewSubject UI
Step 4  — Build passMarkResolver utility
Step 5  — Build StudentMarks model + bulk marks entry API (TEACHER + EXAM_COORDINATOR)
Step 6  — Build SemesterResult model + result declaration + lock/unlock API
Step 7  — Build Teacher marks entry UI (EnterMarks page)
Step 8  — Build Exam Coordinator review + lock/unlock UI
Step 9  — Wire SemesterResult check into promoteStudent as third gate
Step 10 — Add course_id + maxAllowedKTs + minPassMarks to PromotionPolicy
Step 11 — Fix PromotionPolicy versioning (gap #25)
Step 12 — Build checkFeatureFlag utility + seed ATKT_MODULE flag
Step 13 — Wire ATKT logic into promotion controller (Layer 2)
Step 14 — Add activeBacklogs + promotionStatus to Student model
Step 15 — Update PromotionSetting.jsx with ATKT fields (gated by flag)
Step 16 — Build Layer 3 backlog clearance (after Layer 2 is stable)
```

Steps 1–9 = Layer 1 (universally shippable)  
Steps 10–15 = Layer 2 (ATKT, feature-flag gated)  
Step 16 = Layer 3

---

13. Open Questions — Decisions Still Needed

Q1–Q4 are closed. The following remain open. Nothing in Steps 10–16 should be built until Q5–Q8 are answered.

---

### Q5 — ATKT: per-college or per-course policy fallback behaviour
**Context**: `course_id` will be added to `PromotionPolicy`. But the fallback behaviour needs to be defined.  
**Options**:
- A) Course-specific policy overrides college-level policy completely
- B) Course-specific policy merges with college-level (course overrides only the fields it sets, inherits the rest)
- C) No college-level fallback — every course must have its own policy

**Impact**: `getActivePolicy` static method logic, policy creation UI.  
**Decision needed from**: Chetan / product

---

### Q6 — What happens to a DETAINED student?
**Context**: If a student exceeds `maxAllowedKTs` and is detained, what are the options?  
**Options**:
- A) Admin can manually override detention with a reason (audit logged)
- B) Student must re-appear in the same semester (year drop)
- C) Student is automatically suspended/inactive until cleared

**Impact**: `student.promotionStatus` state machine, UI for detained students.  
**Decision needed from**: Chetan / product

---

### Q7 — Does Layer 1 block promotion if no SemesterResult exists?
**Context**: When Layer 1 is first deployed, existing students will have no `SemesterResult` records.  
**Options**:
- A) If no result exists → block promotion (strict — forces data entry)
- B) If no result exists → warn but allow (soft gate — backward compatible)
- C) If no result exists → skip marks check entirely (same as today)

**Impact**: Migration strategy, rollout plan, college admin experience on first use.  
**Decision needed from**: Chetan / product

---

### Q8 — `ATKT_MODULE` opt-in or automatic?
**Context**: Should every college get ATKT once it's built, or does Super Admin enable per college?  
**Options**:
- A) Opt-in — Super Admin explicitly enables per college (recommended)
- B) Opt-out — enabled for all by default, Super Admin can disable
- C) Automatic — all colleges get it on deploy

**Recommendation**: Option A. Matches SaaS model, allows gradual rollout.  
**Decision needed from**: Chetan (confirm or override)

---

### Q9 — Result publishing: who publishes and when visible to students?
**Context**: Marks entered → result locked → result visible to students. Is there a separate publish step?  
**Options**:
- A) Lock = publish (visible to student immediately on lock)
- B) Lock → Exam Coordinator publishes separately (two-step)
- C) Lock → College Admin publishes (admin-controlled release)

**Impact**: `SemesterResult` needs a `isPublished` field if B or C. Student portal visibility logic.  
**Decision needed from**: Chetan / product

---

### Q10 — Diploma programs: semester or annual?
**Context**: `course.model.js` has `programLevel: DIPLOMA`. Diploma programs in Maharashtra often use annual exams.  
**Options**:
- A) All programs use semester system (current assumption)
- B) Diploma uses annual, degree uses semester (requires `termStructure` field on Course — gap #30)
- C) Configurable per course

**Impact**: `course.model.js` `termStructure` field (gap #30), marks entry UI, promotion logic.  
**Decision needed from**: Chetan / product

---

14. What Can Start Immediately (No Decisions Needed)

These are safe, non-breaking changes that unblock everything else:

- Fix bugs #1, #4, #5 in `promotion.controller.js`
- Fix schema constraints #8, #9, #10 (raise hardcoded max values)
- Fix `exam.routes.js` role lock (#11)
- Fix `AuditLog` enums (#12, #13, #14) — include `RESULT_LOCKED`, `RESULT_UNLOCKED`
- Add marks config fields to `Subject` model (`subjectType`, `internalMaxMarks`, `externalMaxMarks`, `internalPassMarks`, `externalPassMarks`, `passMarks`)
- Update `AddSubject.jsx`, `EditSubject.jsx`, `ViewSubject.jsx` to include marks config fields
- Build `passMarkResolver` utility
- Build `checkFeatureFlag` utility
- Seed `ATKT_MODULE` flag
- Add `course_id` to `PromotionPolicy` (the field itself — policy logic waits for Q5)


