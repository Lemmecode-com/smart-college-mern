# NOVAA Sprint Planning — Index

**Project:** smart-college-mern (NOVAA ERP)
**Remote:** git@github.com:ChetanKaturde/smart-college-mern.git
**Production:** https://novaa.lemmecode.com

---

## Files in This Folder

| File | Contents | Audience |
|---|---|---|
| `00-INDEX.md` | This file — overview and navigation | Everyone |
| `01-BUGS-AND-SECURITY.md` | All open GitHub issues — bugs, security, legal | Developers |
| `02-PRODUCTION-DEBT.md` | Production-specific problems found across chat history | Developers |
| `03-NEW-FEATURES.md` | All planned new features from MASTER_PLAN (Phases 1–6) | Developers |
| `04-OPEN-QUESTIONS.md` | All unanswered questions with code evidence | Tech Lead |
| `05-SPRINT-ORDER.md` | Sprint sequence with dependency map | Tech Lead |
| `06-LEADERSHIP-DECISIONS.md` | Plain-language decisions needed — no code | Investors / Bosses |
| `07-MASTER-TASK-LIST.md` | Every task in chronological order with owner and time | Developers / PM |

---

## Quick Summary

### What's broken right now
- Student PDFs in public GitHub repo (legal/DPDPA violation) — Issue #182
- Weak credentials in production `.env` — Issue #225
- 6 bugs in admission flow — Issue #233
- Localhost fallback URLs in 4 frontend files — Issue #224
- Missing FRONTEND_URL / CORS_ORIGINS in production `.env` — Issue #223
- Email completely broken (SMTP not configured)
- Enrollment number never generated

### What needs to be built
- Billing/subscription system (platform has zero revenue mechanism)
- Credential delivery + first login flow
- Per-college email config
- Admission workflow redesign (PENDING → OFFER_MADE → SEAT_CONFIRMED → ENROLLED)
- Year labels (FY/SY/TY)
- Teacher classroom assignment
- New roles: PRINCIPAL, ACCOUNTANT, ADMISSION_OFFICER, EXAM_COORDINATOR, PARENT_GUARDIAN
- Promotion with academic status (PASS/FAIL/ATKT)
- HOD timetable self-management
- Student ID card generation

### Dependency order
```
Fix security/legal issues (no dependencies)
  ↓
Phase 1: Billing + Credentials + Email config (independent of each other)
  ↓
Phase 2: Admission workflow redesign
  ↓
Phase 3: Year labels + Teacher classroom
  ↓
Phase 4: New roles (depends on Phase 2)
Phase 5: Promotion (depends on Phase 2)
  ↓
Phase 6: HOD timetable + ID card (depends on Phase 3)
```
