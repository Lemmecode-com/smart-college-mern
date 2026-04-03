# Version Update Guide

## How to Update Version in NOVAA Project

This guide explains how to update the version number when releasing new features, bug fixes, or major changes.

---

## 📌 Version Numbering System

This project uses **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

| Part | When to Increment | Example |
|------|-------------------|---------|
| **MAJOR** | Breaking changes (incompatible with previous version) | `1.0.0` → `2.0.0` |
| **MINOR** | New features (backward compatible) | `2.0.0` → `2.1.0` |
| **PATCH** | Bug fixes (backward compatible) | `2.0.0` → `2.0.1` |

---

## 📝 Files to Update (In Order)

### 1. **Update `CHANGELOG.md`**

Add your changes under the `[Unreleased]` section first, then create a new version section when releasing.

**Example:**
```markdown
## [Unreleased]

### Added
- New feature description

### Changed
- What was modified

### Fixed
- Bug fix description

---

## [2.1.0] - 2026-03-15

### Added
- Student attendance module
- Email notification system
```

When ready to release, move `[Unreleased]` content to a new version section with today's date.

---

### 2. **Update `package.json` (Root)**

```json
{
  "name": "smart-college-mern",
  "version": "2.1.0",
  ...
}
```

---

### 3. **Update `frontend/package.json`**

```json
{
  "name": "smartcollegefrontend",
  "version": "2.1.0",
  ...
}
```

---

### 4. **Update `backend/package.json`**

```json
{
  "name": "smtclgv1",
  "version": "2.1.0",
  ...
}
```

---

### 5. **Update `.qwen/version.json`**

```json
{
  "version": "2.1.0",
  "codename": "Feature Release Name",
  "releaseDate": "2026-03-15"
}
```

---

### 6. **Update Landing Page Footer**

**File:** `landing-pages/landing-page-1.html`

Find and update the version badge:
```html
<span class="version-badge">v2.1.0</span>
```

---

## ✅ Pre-Release Checklist

Before releasing a new version:

- [ ] All changes documented in `CHANGELOG.md`
- [ ] Version updated in all 5 files
- [ ] Landing page displays correct version
- [ ] Tests passing (if applicable)
- [ ] Code reviewed and approved
- [ ] Git commit ready

---

## 🚀 Release Commands (Optional)

After updating version files:

```bash
# Stage all changes
git add .

# Commit with version message
git commit -m "chore: release version 2.1.0"

# Create a git tag
git tag -a v2.1.0 -m "Release version 2.1.0"

# Push to remote
git push origin main
git push origin v2.1.0
```

---

## 📊 Version History Quick Reference

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 2.0.0 | 2026-03-07 | Major | MVP Phase 2 Complete |
| 1.0.0 | 2025-12-31 | Major | Initial MVP Phase 1 |

---

## 🎯 Quick Update Script (Optional)

For faster updates, you can use this approach:

1. Decide new version (e.g., `2.1.0`)
2. Use Find & Replace in your code editor:
   - Find: `2.0.0`
   - Replace: `2.1.0`
3. Update `CHANGELOG.md` manually
4. Verify all files updated

---

## 📞 Need Help?

Refer to:
- [Semantic Versioning Spec](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

**Last Updated:** 2026-03-07  
**Current Version:** 2.0.0
