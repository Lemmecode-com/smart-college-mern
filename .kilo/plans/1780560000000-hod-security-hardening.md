# HOD Multi-Tenant Security Hardening - Implementation Plan

## Schema Verification

### Timetable Schema
- **college_id present?** YES - Required field (line 4-8)
- Stored directly on document
- Indexed for fast queries

### TimetableSlot Schema
- **college_id present?** YES - Required field (line 5-9)
- Stored directly on document
- Indexed for fast queries

### TimetableException Schema
- **college_id present?** YES - Required field (line 7-12)
- Stored directly on document
- Indexed for fast queries

---

## Summary
This plan addresses cross-tenant access vulnerabilities in timetable-related controllers by adding missing `college_id` filtering to `findById()` operations.

---

## Vulnerable Queries Found

### 1. timetable.controller.js

| Line | Function | Query | Issue |
|------|----------|-------|-------|
| 103 | `publishTimetable()` | `Timetable.findById(req.params.id)` | Missing college_id - allows access to any timetable by ID |
| 698 | `deleteTimetable()` | `Timetable.findById(id)` | Missing college_id - allows deletion of any timetable by ID |

### 2. timetableSlot.controller.js

| Line | Function | Query | Issue |
|------|----------|-------|-------|
| 164 | `updateSlot()` - Step 1 | `TimetableSlot.findById(slotId)` | Missing college_id - slot lookup not college-scoped |
| 170 | `updateSlot()` - Step 2 | `Timetable.findById(slot.timetable_id)` | Missing college_id - timetable lookup not college-scoped |
| 244 | `deleteTimetableSlot()` - Step 1 | `TimetableSlot.findById(slotId)` | Missing college_id - slot lookup not college-scoped |
| 250 | `deleteTimetableSlot()` - Step 2 | `Timetable.findById(slot.timetable_id)` | Missing college_id - timetable lookup not college-scoped |

### 3. timetableException.controller.js

| Line | Function | Query | Issue |
|------|----------|-------|-------|
| 516 | `updateException()` | `Timetable.findById(exception.timetable_id)` | Missing college_id - timetable lookup not college-scoped |
| 623 | `deleteException()` | `Timetable.findById(exception.timetable_id)` | Missing college_id - timetable lookup not college-scoped |
| 684 | `approveException()` | `Timetable.findById(exception.timetable_id)` | Missing college_id - timetable lookup not college-scoped |
| 749 | `rejectException()` | `Timetable.findById(exception.timetable_id)` | Missing college_id - timetable lookup not college-scoped |

---

## Files Modified

1. `backend/src/controllers/timetable.controller.js`
2. `backend/src/controllers/timetableSlot.controller.js`
3. `backend/src/controllers/timetableException.controller.js`

---

## Exact Changes

### File 1: backend/src/controllers/timetable.controller.js

#### Change 1: publishTimetable() (line 103)

**Before:**
```javascript
const timetable = await Timetable.findById(req.params.id);
```

**After:**
```javascript
const timetable = await Timetable.findOne({
  _id: req.params.id,
  college_id: req.college_id,
});
```

#### Change 2: deleteTimetable() (line 698)

**Before:**
```javascript
const { id } = req.params;
const timetable = await Timetable.findById(id);
```

**After:**
```javascript
const { id } = req.params;
const timetable = await Timetable.findOne({
  _id: id,
  college_id: req.college_id,
});
```

---

### File 2: backend/src/controllers/timetableSlot.controller.js

#### Change 1: updateSlot() - Step 1 (line 164)

**Before:**
```javascript
const slot = await TimetableSlot.findById(slotId);
```

**After:**
```javascript
const slot = await TimetableSlot.findOne({
  _id: slotId,
  college_id: req.college_id,
});
```

#### Change 2: updateSlot() - Step 2 (line 170)

**Before:**
```javascript
const timetable = await Timetable.findById(slot.timetable_id);
```

**After:**
```javascript
const timetable = await Timetable.findOne({
  _id: slot.timetable_id,
  college_id: req.college_id,
});
```

#### Change 3: deleteTimetableSlot() - Step 1 (line 244)

**Before:**
```javascript
const slot = await TimetableSlot.findById(slotId);
```

**After:**
```javascript
const slot = await TimetableSlot.findOne({
  _id: slotId,
  college_id: req.college_id,
});
```

#### Change 4: deleteTimetableSlot() - Step 2 (line 250)

**Before:**
```javascript
const timetable = await Timetable.findById(slot.timetable_id);
```

**After:**
```javascript
const timetable = await Timetable.findOne({
  _id: slot.timetable_id,
  college_id: req.college_id,
});
```

---

### File 3: backend/src/controllers/timetableException.controller.js

#### Change 1: updateException() (line 516)

**Before:**
```javascript
const timetable = await Timetable.findById(exception.timetable_id);
```

**After:**
```javascript
const timetable = await Timetable.findOne({
  _id: exception.timetable_id,
  college_id: req.college_id,
});
```

#### Change 2: deleteException() (line 623)

**Before:**
```javascript
const timetable = await Timetable.findById(exception.timetable_id);
```

**After:**
```javascript
const timetable = await Timetable.findOne({
  _id: exception.timetable_id,
  college_id: req.college_id,
});
```

#### Change 3: approveException() (line 684)

**Before:**
```javascript
const timetable = await Timetable.findById(exception.timetable_id);
```

**After:**
```javascript
const timetable = await Timetable.findOne({
  _id: exception.timetable_id,
  college_id: req.college_id,
});
```

#### Change 4: rejectException() (line 749)

**Before:**
```javascript
const timetable = await Timetable.findById(exception.timetable_id);
```

**After:**
```javascript
const timetable = await Timetable.findOne({
  _id: exception.timetable_id,
  college_id: req.college_id,
});
```

---

## Is the proposed fix valid?

**YES** - All three models have `college_id` as a required field, making the proposed `findOne({ _id: id, college_id: req.college_id })` pattern valid and correct.

### Query Pattern Validation

| Model | college_id Direct? | college Inherited via timetable_id? | college Inherited via department_id? |
|-------|-------------------|----------------------------------|-----------------------------------|
| Timetable | YES | N/A | N/A |
| TimetableSlot | YES | YES (via timetable_id) | YES (via department_id) |
| TimetableException | YES | YES (via timetable_id) | YES (via department_id) |

**Recommendation**: Adding `college_id` to all queries is the correct approach because:
1. Direct `college_id` field exists on all models
2. Query performance benefits from existing indexes
3. Consistent pattern with other secure queries in the codebase

| Vulnerability | Before Fix | After Fix |
|---------------|------------|-----------|
| HOD from College A can access College B timetable via guessed ID in publishTimetable | ✓ Vulnerable | ✗ Blocked (college_id enforced) |
| HOD from College A can delete College B timetable via guessed ID in deleteTimetable | ✓ Vulnerable | ✗ Blocked (college_id enforced) |
| HOD from College A can update College B slots via updateSlot | ✓ Vulnerable | ✗ Blocked (slot + timetable college_id enforced) |
| HOD from College A can delete College B slots via deleteTimetableSlot | ✓ Vulnerable | ✗ Blocked (slot + timetable college_id enforced) |
| HOD from College A can manipulate College B exceptions via updateException | ✓ Vulnerable | ✗ Blocked (timetable college_id enforced) |
| HOD from College A can delete College B exceptions via deleteException | ✓ Vulnerable | ✗ Blocked (timetable college_id enforced) |
| HOD from College A can approve/reject College B exceptions | ✓ Vulnerable | ✗ Blocked (timetable college_id enforced) |

---

## Regression Risks

1. **Low Risk**: All changes are additive security checks - no functionality removed
2. **No Breaking Changes**: Existing valid requests will continue to work; invalid cross-tenant requests will now be rejected with 404
3. **HOD Middleware Dependency**: These endpoints rely on `hod.middleware.js` which already validates the user is an HOD of a department. The added `college_id` check ensures the target resource belongs to the same college.
4. **Error Handling**: Queries now return 404 instead of 403 in some cases where resource exists in another college - this is acceptable security behavior

---

## Verification Steps

1. Run existing tests to ensure no regression
2. Test cross-college ID access attempt should return 404
3. Test valid HOD access to own college resources works
4. Verify error messages remain user-friendly