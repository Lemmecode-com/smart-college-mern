# Sprint Order — Recommended Sequence

Based on: dependency map, severity of issues, what blocks what.

---

## Sprint 0 — Immediate Fixes (No Dependencies, Do Now)

All independent. No feature work should start until these are done.

| Task | Issue | Who | Time |
|---|---|---|---|
| Fix Gmail App Password in `.env` | — | DevOps | 15 min |
| Remove student PDFs from GitHub repo + BFG history rewrite | #182 | Rohidas | 1 hr |
| Rotate JWT_SECRET, fix SUPER_ADMIN_PASSWORD, fix Stripe key | #225 | DevOps | 30 min |
| Add FRONTEND_URL and CORS_ORIGINS to production `.env` | #223 | DevOps | 15 min |
| Fix localhost fallback in 4 frontend files | #224 | Frontend | 1 hr |
| Remove duplicate `GET /registered` route | #233 Bug 1 | Backend | 10 min |
| Fix `validateStudentId` wrong param | #233 Bug 4 | Backend | 15 min |
| Add missing `next` to `updateMyProfile` and `updateStudentByAdmin` | #233 Bug 5 | Backend | 15 min |

**Goal:** Production is secure, emails work, safe bug fixes done.

---

## Sprint 1 — Phase 1 Foundation (3 parallel tracks)

These three tracks are independent of each other. Assign to different developers.

### Track A — Billing Model
**Blocked by:** Q-BILL-1 (pricing tiers) and Q-BILL-2 (billing cycle) — get answers before invoice UI
**Can start now:** College model additions, Invoice model, fix collegeIsolation middleware

### Track B — Credential Delivery
**No blockers.** Start immediately after Sprint 0.

### Track C — Per-College Email Config
**No blockers.** Start immediately after Sprint 0 Gmail fix.

---

## Sprint 2 — Phase 2: Admission Workflow Redesign

**Blocked by:** Sprint 1 Track B complete
**Blocked by:** Q-ADM-1, Q-ADM-2, Q-ADM-3 answers
**Blocked by:** Maintenance window scheduled (Q-ADM-5)

Key steps:
1. Run migration: `APPROVED` → `ENROLLED` on all existing students (before any code change)
2. New status constants + Student model updates
3. New controller actions: `makeOffer`, `confirmSeat`, `enrollStudent`, `withdrawOffer`
4. Fix orphaned User bug + implement enrollment number generation
5. Update all `APPROVED` references across codebase
6. Frontend: 4 state-aware buttons, admission funnel view, updated filters

---

## Sprint 3 — Phase 3: Year Labels + Teacher Classroom

**Can run in parallel with Sprints 1 and 2 — only needs Sprint 0 complete**
**Blocked by:** Q-YR-1, Q-TCH-1, Q-TCH-3 answers

---

## Sprint 4 — Phase 4: New Roles

**Blocked by:** Sprint 2 complete (ADMISSION_OFFICER needs new status states)
**Blocked by:** Sprint 1 Track B complete (staff account creation needs credential delivery)
**Blocked by:** Q-ROLE-1, Q-ROLE-2, Q-ROLE-4, Q-ROLE-5 answers

Order: Foundation tasks first → ACCOUNTANT → ADMISSION_OFFICER → PRINCIPAL → EXAM_COORDINATOR → PARENT_GUARDIAN → PLATFORM_SUPPORT → Login routing

---

## Sprint 5 — Phase 5: Promotion with Academic Status

**Blocked by:** Sprint 2 complete (uses ENROLLED status)
**Blocked by:** Q-PROM-1 answer (max ATKT count)
**Can run in parallel with Sprint 4**

---

## Sprint 6 — Phase 6: HOD Timetable + ID Card

**Blocked by:** Sprint 3 complete (needs year labels + teacher classroom assignment)
**Blocked by:** Q-HOD-1, Q-HOD-2, Q-ID-1, Q-ID-2, Q-ID-3 answers

---

## Dependency Map

```
Sprint 0 (security/legal fixes)
    │
    ├── Sprint 1A (billing)          ← blocked by Q-BILL-1, Q-BILL-2
    ├── Sprint 1B (credentials)      ← no blockers
    └── Sprint 1C (email config)     ← no blockers
              │
              └── Sprint 2 (admission workflow)   ← blocked by Sprint 1B + Q-ADM answers
                        │
                        ├── Sprint 4 (new roles)  ← blocked by Sprint 2 + Sprint 1B + Q-ROLE answers
                        └── Sprint 5 (promotion)  ← blocked by Sprint 2 + Q-PROM-1

Sprint 3 (year labels + teacher classroom)   ← blocked by Sprint 0 + Q-YR-1, Q-TCH answers
    │
    └── Sprint 6 (HOD timetable + ID card)   ← blocked by Sprint 3 + Q-HOD, Q-ID answers
```

---

## What to Do Right Now (Today)

1. Run Sprint 0 fixes — no questions needed, just do it
2. Answer Q-EMAIL-1 (Gmail access) — unblocks all emails immediately
3. Answer Q-BILL-1 and Q-BILL-2 — unblocks billing invoice UI
4. Answer Q-ADM-1 through Q-ADM-5 — unblocks Sprint 2
5. Assign Sprint 1 tracks to developers (all three can run in parallel)
