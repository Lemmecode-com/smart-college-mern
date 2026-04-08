# 🧪 Testing Guide - Audit Log Implementation (Issue #25)

## ✅ Implementation Summary

### Backend Changes:
1. ✅ **NEW** `backend/src/models/auditLog.model.js` - Audit log schema
2. ✅ **NEW** `backend/src/services/auditLog.service.js` - Audit logging service
3. ✅ **NEW** `backend/src/controllers/auditLog.controller.js` - API endpoints
4. ✅ **NEW** `backend/src/routes/auditLog.routes.js` - Route definitions
5. ✅ **UPDATED** `backend/app.js` - Registered `/api/audit-logs` route
6. ✅ **FIXED** `backend/src/routes/securityAudit.routes.js` - Added SUPER_ADMIN role restriction
7. ✅ **UPDATED** `backend/src/controllers/studentApproval.controller.js` - Added audit logging
8. ✅ **UPDATED** `backend/src/controllers/feeStructure.controller.js` - Added audit logging
9. ✅ **UPDATED** `backend/src/controllers/student.controller.js` - Added audit logging

### Frontend Changes:
1. ✅ **NEW** `frontend/src/pages/dashboard/College-Admin/AuditLogs.jsx` - Audit Logs page
2. ✅ **UPDATED** `frontend/src/App.jsx` - Added route `/college-admin/audit-logs`
3. ✅ **UPDATED** `frontend/src/components/Sidebar/config/navigation.config.js` - Added sidebar menu entry

---

## 🚀 How to Test

### Step 1: Start Backend Server

```bash
cd d:\LemmeCode\SmartCollege\smart-college-mern\backend
npm start
```

**Expected:** Server starts on `http://localhost:5000`

### Step 2: Start Frontend Server

```bash
cd d:\LemmeCode\SmartCollege\smart-college-mern\frontend
npm run dev
```

**Expected:** Frontend starts on `http://localhost:5173`

### Step 3: Login as COLLEGE_ADMIN

1. Open browser: `http://localhost:5173`
2. Login with COLLEGE_ADMIN credentials
3. Check sidebar navigation → **Reports & Analytics** section
4. You should see **"Audit Logs"** menu item with a checkmark icon
5. Click on "Audit Logs"

### Step 4: View Audit Logs Page

**Expected to see:**
- ✅ Page header: "Audit Logs" with shield icon
- ✅ Subtitle: "Track all admin actions on student data (DPDPA 2026)"
- ✅ Statistics cards showing:
  - Last 24 Hours count
  - Last 7 Days count
  - Last 30 Days count
  - Total Actions count
- ✅ "Filters" button (click to show filters)
- ✅ Filter options:
  - Action Type (dropdown: Created, Updated, Deleted, Approved, Rejected, Bulk Approved)
  - Resource Type (dropdown: Student, Student Approval, Fee Structure, etc.)
  - Start Date (date picker)
  - End Date (date picker)
- ✅ Audit logs table with columns:
  - Timestamp
  - Action (with colored badges)
  - Resource (with icons)
  - User (email)
  - IP Address
  - Details (button)
- ✅ Pagination controls
- ✅ If no logs: Message "No audit logs found"

---

## 🎯 Testing Scenarios

### Scenario 1: Student Approval Audit Log

1. Go to **Pending Approvals** page
2. Approve a student
3. Navigate to **Audit Logs** page
4. **Expected:** New entry with:
   - Action: "APPROVED" (green badge)
   - Resource: "Student Approval"
   - Timestamp: Current time
   - Click "View Details" → Shows student info

### Scenario 2: Student Rejection Audit Log

1. Go to **Pending Approvals** page
2. Reject a student (provide a reason)
3. Navigate to **Audit Logs** page
4. **Expected:** New entry with:
   - Action: "REJECTED" (red badge)
   - Resource: "Student Approval"
   - Click "View Details" → Shows rejection reason

### Scenario 3: Fee Structure Creation

1. Go to **Create Fee Structure** page
2. Create a new fee structure
3. Navigate to **Audit Logs** page
4. **Expected:** New entry with:
   - Action: "CREATED" (green badge)
   - Resource: "Fee Structure"
   - Click "View Details" → Shows fee details

### Scenario 4: Fee Structure Update

1. Go to **Fee Structures List** page
2. Edit an existing fee structure
3. Change the total fee amount
4. Save changes
5. Navigate to **Audit Logs** page
6. **Expected:** New entry with:
   - Action: "UPDATED" (blue badge)
   - Resource: "Fee Structure"
   - Click "View Details" → Shows old and new values

### Scenario 5: Student Update by Admin

1. Go to **Approved Students** list
2. Edit a student's details (e.g., mobile number, address)
3. Save changes
4. Navigate to **Audit Logs** page
5. **Expected:** New entry with:
   - Action: "UPDATED" (blue badge)
   - Resource: "Student"
   - Click "View Details" → Shows changed fields

### Scenario 6: Filter Audit Logs

1. Go to **Audit Logs** page
2. Click **Filters** button
3. Select Action Type: "APPROVED"
4. **Expected:** Table shows only approval actions
5. Clear filters
6. Select Resource Type: "Fee Structure"
7. **Expected:** Table shows only fee structure actions
8. Set date range (e.g., last 7 days)
9. **Expected:** Table shows only entries within that date range

---

## 🔐 Security Testing

### Test 1: SUPER_ADMIN cannot access Audit Logs

1. Login as SUPER_ADMIN
2. Try to access: `http://localhost:5173/college-admin/audit-logs`
3. **Expected:** Redirected to dashboard (403 Forbidden)

### Test 2: COLLEGE_ADMIN cannot access Security Audit

1. Login as COLLEGE_ADMIN
2. Try to access: `http://localhost:5173/admin/security-audit`
3. **Expected:** Redirected to dashboard (403 Forbidden)

### Test 3: STUDENT cannot access Audit Logs

1. Login as STUDENT
2. Try to access: `http://localhost:5173/college-admin/audit-logs`
3. **Expected:** Redirected to dashboard (403 Forbidden)

---

## 🔍 API Testing (Using Postman/Thunder Client)

### Test 1: Get Audit Logs

```http
GET http://localhost:5000/api/audit-logs
Authorization: Bearer <COLLEGE_ADMIN_JWT_TOKEN>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "collegeId": "...",
      "userId": "...",
      "userEmail": "admin@college.com",
      "userRole": "COLLEGE_ADMIN",
      "action": "APPROVE",
      "resourceType": "StudentApproval",
      "resourceId": "...",
      "ipAddress": "::1",
      "newValues": { ... },
      "createdAt": "2026-04-08T...",
      "updatedAt": "2026-04-08T..."
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

### Test 2: Get Audit Log Stats

```http
GET http://localhost:5000/api/audit-logs/stats
Authorization: Bearer <COLLEGE_ADMIN_JWT_TOKEN>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "last24Hours": 5,
    "last7Days": 15,
    "last30Days": 45,
    "actionsByType": [
      { "_id": "APPROVE", "count": 10 },
      { "_id": "UPDATE", "count": 20 },
      { "_id": "CREATE", "count": 15 }
    ],
    "resourcesByType": [
      { "_id": "StudentApproval", "count": 10 },
      { "_id": "FeeStructure", "count": 20 },
      { "_id": "Student", "count": 15 }
    ],
    "recentActivity": [...]
  }
}
```

### Test 3: Filter Audit Logs

```http
GET http://localhost:5000/api/audit-logs?action=APPROVE&resourceType=StudentApproval&page=1&limit=10
Authorization: Bearer <COLLEGE_ADMIN_JWT_TOKEN>
```

**Expected:** Filtered results showing only APPROVE actions on StudentApproval

### Test 4: Unauthorized Access (Wrong Role)

```http
GET http://localhost:5000/api/audit-logs
Authorization: Bearer <STUDENT_JWT_TOKEN>
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Access denied: This operation requires one of the following roles: COLLEGE_ADMIN",
  "code": "ROLE_NOT_ALLOWED"
}
```

### Test 5: Security Audit - SUPER_ADMIN Only

```http
GET http://localhost:5000/api/security-audit
Authorization: Bearer <COLLEGE_ADMIN_JWT_TOKEN>
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Access denied: This operation requires one of the following roles: SUPER_ADMIN",
  "code": "ROLE_NOT_ALLOWED"
}
```

---

## 🗄️ MongoDB Verification

Connect to MongoDB and verify:

### Check Audit Logs Collection

```javascript
// View all audit logs
db.auditlogs.find().pretty()

// Count total logs
db.auditlogs.countDocuments()

// View logs by action type
db.auditlogs.find({ action: "APPROVE" }).pretty()

// View logs by resource type
db.auditlogs.find({ resourceType: "FeeStructure" }).pretty()

// View logs by date range
db.auditlogs.find({
  createdAt: {
    $gte: new Date("2026-04-01"),
    $lte: new Date("2026-04-08")
  }
}).pretty()

// Check indexes
db.auditlogs.getIndexes()
```

**Expected Indexes:**
- `_id_` (default)
- `collegeId_1_resourceType_1_createdAt_-1`
- `collegeId_1_userId_1_createdAt_-1`
- `collegeId_1_action_1_createdAt_-1`
- `createdAt_-1`

---

## ✅ Verification Checklist

- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Audit Logs menu appears in COLLEGE_ADMIN sidebar
- [ ] Audit Logs page loads successfully
- [ ] Statistics cards display correct counts
- [ ] Filters work correctly (action, resource, date)
- [ ] Student approval creates audit log entry
- [ ] Student rejection creates audit log entry
- [ ] Fee structure creation creates audit log entry
- [ ] Fee structure update creates audit log with old/new values
- [ ] Student update creates audit log with changed fields
- [ ] Pagination works correctly
- [ ] "View Details" button shows action details
- [ ] SUPER_ADMIN cannot access `/college-admin/audit-logs`
- [ ] COLLEGE_ADMIN cannot access `/admin/security-audit`
- [ ] STUDENT cannot access `/college-admin/audit-logs`
- [ ] MongoDB collection has proper indexes
- [ ] Audit logging failures don't break primary operations

---

## 🐛 Troubleshooting

### Issue: "Audit Logs" menu not appearing in sidebar

**Solution:** 
- Clear browser cache
- Restart frontend dev server
- Check browser console for errors

### Issue: "Failed to load audit logs" error

**Solution:**
- Check backend server is running
- Verify JWT token is valid
- Check browser console for detailed error
- Check backend logs for errors

### Issue: No audit logs appearing after admin actions

**Solution:**
- Check MongoDB `auditlogs` collection directly
- Check backend console for "Audit log failed" errors
- Verify audit log service is imported correctly in controllers

### Issue: 403 Forbidden when accessing audit logs

**Solution:**
- Verify you're logged in as COLLEGE_ADMIN
- Check JWT token has correct role
- Verify college middleware is working

---

## 📊 What Gets Logged

| Action | Resource Type | Triggered By |
|--------|--------------|--------------|
| APPROVE | StudentApproval | Approving a pending student |
| REJECT | StudentApproval | Rejecting a pending student |
| BULK_APPROVE | StudentApproval | Bulk approving students |
| CREATE | FeeStructure | Creating fee structure |
| UPDATE | FeeStructure | Updating fee structure |
| DELETE | FeeStructure | Deleting fee structure |
| UPDATE | Student | Admin updating student details |

---

## 🎉 Success Criteria

✅ All admin actions are logged automatically  
✅ COLLEGE_ADMIN can view audit logs for their college only  
✅ SUPER_ADMIN cannot access college admin audit logs  
✅ Filters and pagination work correctly  
✅ Old and new values are captured for UPDATE actions  
✅ No breaking changes to existing functionality  
✅ Audit logging failures don't break primary operations  

---

## 📝 Notes

- Audit logs are stored indefinitely (no TTL index)
- Fire-and-forget pattern: audit failures won't break operations
- College isolation is enforced at middleware level
- IP addresses are captured for traceability
- DPDPA 2026 compliance achieved
