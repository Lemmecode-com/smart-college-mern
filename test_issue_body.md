**Source:** SuperAdmin role test suite — Test Case `TC-040`
**Module:** Add College
**Original QA Priority:** High
**Assigned Severity:** Critical

**Test Scenario:** Admin Email format & duplicate validation

**Expected Result:**
Proper validation error should be shown

**Actual Result / QA Notes:**
Duplicate email correctly prevents college creation, but the error message is not shown properly. It displays a raw backend error ("Validation Error: E11000 duplicate key error collection: SMARTCOLLEGE.colleges index: email_1 dup key: { email: 'tccollege@gmail.com' }") instead of a proper, user-friendly validation message.

**Status in QA sheet:** Fail

---
_Auto-generated from Novaa_QA_TestCases_RoleWise.xlsx. Reference project: Smart College MERN._