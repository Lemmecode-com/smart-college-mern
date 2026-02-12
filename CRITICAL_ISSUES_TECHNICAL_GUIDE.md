# Technical Implementation Guide for Critical Issues

## Issue #1: API Endpoint Mismatches - Fee Structure Module

### Problem
Frontend fee structure components are calling incorrect API endpoints that don't match backend routes.

### Current State
- **Backend Route**: `/api/fee-structures`
- **Frontend Issues**:
  - CreateFeeStructure.jsx: calls `/fees/structure`
  - EditFeeStructure.jsx: calls `/fees/structure/${id}`
  - ViewFeeStructure.jsx: calls `/fees/structure/${id}`

### Solution Steps
1. Locate the frontend files:
   - `frontend/src/pages/dashboard/College-Admin/CreateFeeStructure.jsx`
   - `frontend/src/pages/dashboard/College-Admin/EditFeeStructure.jsx`
   - `frontend/src/pages/dashboard/College-Admin/ViewFeeStructure.jsx`

2. Update API calls in each file:
   ```javascript
   // Change from:
   api.get('/fees/structure')
   api.post('/fees/structure', data)
   api.put('/fees/structure/${id}', data)
   api.delete('/fees/structure/${id}')
   
   // Change to:
   api.get('/api/fee-structures')
   api.post('/api/fee-structures', data)
   api.put('/api/fee-structures/${id}', data)
   api.delete('/api/fee-structures/${id}')
   ```

3. Test each component to ensure functionality

## Issue #2: Hardcoded Localhost URLs in Production

### Problem
`frontend/src/pages/auth/StudentRegister.jsx` contains hardcoded localhost URL on line 10.

### Solution Steps
1. Open `frontend/src/pages/auth/StudentRegister.jsx`
2. Locate the baseURL configuration on line 10
3. Replace the hardcoded URL with an environment variable:

```javascript
// Change from:
const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

// Change to:
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api"
});
```

4. Create or update `.env` file in the frontend directory:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

5. For production, ensure the environment variable is set appropriately or use relative paths

## Issue #3: Security Vulnerabilities

### Problem Areas Identified
1. JWT tokens stored in localStorage (XSS vulnerable)
2. No CSRF protection
3. Missing input validation on frontend
4. Potential SQL injection in backend queries
5. No rate limiting on authentication endpoints

### Solution Steps

#### Part A: Secure JWT Storage
1. Update `frontend/src/auth/AuthContext.jsx`:
```javascript
// Instead of storing JWT in localStorage:
localStorage.setItem('token', token);

// Store in httpOnly cookie via backend:
// Send token in secure httpOnly cookie from backend
// Or use sessionStorage with additional security measures
```

2. Update backend to set httpOnly cookie:
```javascript
// In auth controller after successful login:
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
});
```

#### Part B: Input Validation
1. Add validation to all frontend forms using a validation library like Joi or Yup
2. Add server-side validation in all controllers:
```javascript
const { body, validationResult } = require('express-validator');

// Example validation middleware
const validateUser = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
];

// In route definition:
app.post('/users', validateUser, userController.createUser);
```

#### Part C: Rate Limiting
1. Install express-rate-limit:
```bash
npm install express-rate-limit
```

2. Add to app.js:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/auth', limiter); // Apply to auth routes
```

## Issue #4: Student Data Fetching Issues

### Problem
AddStudent.jsx uses non-existent generic `/students` endpoints.

### Current Incorrect Implementation
- Uses `api.get("/students")` for roll number generation (endpoint doesn't exist)
- Uses `api.post("/students")` for student creation (should use registration endpoint)

### Solution Steps
1. Locate `frontend/src/pages/students/AddStudent.jsx`
2. Update API calls to use correct endpoints:
```javascript
// Change from:
api.get("/students")  // for roll number generation
api.post("/students") // for student creation

// Change to:
api.get("/students/registered")        // for pending students
api.get("/students/approved-students") // for approved students
api.post(`/students/register/${collegeCode}`) // for new registrations
```

3. Implement proper logic for roll number generation if needed
4. Update the component to handle the new API responses

## Issue #5: Missing Teacher-Student Endpoint

### Problem
MyStudents.jsx component calls `/students/teacher` endpoint which doesn't exist in backend.

### Solution Steps

#### Part A: Backend Implementation
1. Add route to `backend/src/routes/student.routes.js`:
```javascript
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');

router.get('/teacher', auth, studentController.getStudentsForTeacher);

module.exports = router;
```

2. Add controller function to `backend/src/controllers/student.controller.js`:
```javascript
const getStudentsForTeacher = async (req, res) => {
  try {
    const teacherId = req.user.id; // Assuming user info is attached by auth middleware
    
    // Logic to find students associated with teacher's subjects
    const students = await Student.find({
      subjectIds: { $in: req.user.subjects } // Assuming teacher has assigned subjects
    }).populate('enrolledCourses');
    
    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  // ... other exports
  getStudentsForTeacher
};
```

3. Mount the route in the main app file if not already done

#### Part B: Frontend Implementation
1. Update `frontend/src/pages/dashboard/Teacher/MyStudents.jsx` to call the new endpoint:
```javascript
// In the useEffect or wherever the API call is made:
useEffect(() => {
  const fetchMyStudents = async () => {
    try {
      const response = await api.get('/students/teacher');
      setStudents(response.data.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };
  
  fetchMyStudents();
}, []);
```

## Testing Checklist

After implementing each solution:

### API Endpoint Fixes
- [ ] Create fee structure form submits successfully
- [ ] Edit fee structure form updates correctly
- [ ] View fee structure displays data properly
- [ ] Network tab shows correct API endpoints being called

### URL Configuration
- [ ] Student registration form submits successfully
- [ ] API calls use correct base URL in both dev and prod
- [ ] No localhost references in production build

### Security Improvements
- [ ] JWT tokens are not visible in localStorage
- [ ] Authentication still works after changes
- [ ] Input validation prevents malicious input
- [ ] Rate limiting is active on auth endpoints

### Student Data Fetching
- [ ] Add student form works correctly
- [ ] Correct API endpoints are called
- [ ] Student data displays properly

### Teacher-Student Endpoint
- [ ] Teacher can view their assigned students
- [ ] Students are filtered correctly based on teacher's subjects
- [ ] Endpoint returns expected data structure

## Rollback Plan
If any implementation causes issues:
1. Revert the specific file changes
2. Restart the application
3. Verify previous functionality is restored
4. Document the issue for further investigation