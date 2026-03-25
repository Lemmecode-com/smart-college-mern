# Stripe Configuration API - Complete Verification Guide

## ✅ Implementation Verification

### 1. API Endpoints

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/api/admin/stripe/config` | Save/Update Stripe config | ✅ Implemented |
| GET | `/api/admin/stripe/config` | Fetch Stripe config | ✅ Implemented |
| POST | `/api/admin/stripe/verify` | Verify credentials | ✅ Implemented |
| DELETE | `/api/admin/stripe/config` | Delete config | ✅ Implemented |
| GET | `/api/admin/stripe/test` | Test connection | ✅ Implemented |

### 2. Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Request with Cookie: token=JWT                             │
│  ↓                                                           │
│  auth.middleware.js                                         │
│  - Extracts token from cookie                               │
│  - Verifies JWT signature                                   │
│  - Checks blacklist                                         │
│  - Attaches req.user = { id, role, college_id }            │
│  ↓                                                           │
│  checkCollegeAccess middleware                              │
│  - Verifies role === "COLLEGE_ADMIN"                        │
│  - Verifies req.user.college_id exists                      │
│  - Sets req.college_id = req.user.college_id               │
│  ↓                                                           │
│  Controller (saveStripeConfig / getStripeConfig)           │
│  - Uses req.college_id for database operations             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Database Schema

```javascript
// CollegePaymentConfig Model
{
  collegeId: ObjectId,          // ← Links to specific college
  gatewayCode: "stripe",        // Payment gateway identifier
  credentials: {
    keyId: String,              // Publishable key (NOT encrypted)
    keySecret: String,          // Secret key (ENCRYPTED with AES-256-GCM)
    webhookSecret: String       // Webhook secret (ENCRYPTED, optional)
  },
  configuration: {
    currency: "INR",
    enabled: true,
    testMode: true              // true = test keys, false = live keys
  },
  isActive: true,               // Soft delete support
  lastVerifiedAt: Date,         // Last successful verification
  verifiedBy: ObjectId,         // Admin who verified
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Security Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Encryption at Rest** | AES-256-GCM encryption for secret keys | ✅ |
| **Key Isolation** | Each college has separate encrypted keys | ✅ |
| **Secret Masking** | GET response excludes secret keys | ✅ |
| **Access Control** | College admin can only access own config | ✅ |
| **JWT Authentication** | All routes require valid JWT token | ✅ |
| **College Isolation** | Middleware enforces college_id scoping | ✅ |

---

## 📋 Request/Response Examples

### POST /api/admin/stripe/config

**Request:**
```http
POST http://localhost:5000/api/admin/stripe/config
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "publishableKey": "pk_test_51ABC123xyz",
  "secretKey": "sk_test_51ABC123xyz",
  "webhookSecret": "whsec_1ABC123xyz",
  "testMode": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Stripe configuration saved successfully",
  "config": {
    "id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "gatewayCode": "stripe",
    "credentials": {
      "keyId": "pk_test_51ABC123xyz",
      "hasSecret": true,
      "hasWebhookSecret": true
    },
    "configuration": {
      "currency": "INR",
      "enabled": true,
      "testMode": true
    },
    "isActive": true,
    "isTestMode": true
  }
}
```

### GET /api/admin/stripe/config

**Request:**
```http
GET http://localhost:5000/api/admin/stripe/config
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Configured):**
```json
{
  "success": true,
  "configured": true,
  "config": {
    "id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "gatewayCode": "stripe",
    "credentials": {
      "keyId": "pk_test_51ABC123xyz",
      "hasSecret": true,
      "hasWebhookSecret": true
    },
    "configuration": {
      "currency": "INR",
      "enabled": true,
      "testMode": true
    },
    "isActive": true,
    "lastVerifiedAt": "2026-03-18T10:30:00.000Z",
    "createdAt": "2026-03-18T09:00:00.000Z",
    "updatedAt": "2026-03-18T10:30:00.000Z",
    "isTestMode": true
  }
}
```

**Response (Not Configured):**
```json
{
  "success": true,
  "configured": false,
  "message": "Stripe is not configured for this college"
}
```

---

## 🧪 Testing Steps

### Method 1: Using the Test Script

```bash
# Navigate to backend directory
cd backend

# Run the test script
node test-stripe-config.js
```

### Method 2: Using Postman

**Step 1: Login**
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "collegeadmin@testcollege.com",
  "password": "TestPassword123!"
}
```
Copy the `token` from response cookies.

**Step 2: Save Configuration**
```
POST http://localhost:5000/api/admin/stripe/config
Content-Type: application/json
Cookie: token=YOUR_TOKEN_HERE

{
  "publishableKey": "pk_test_51ABC123",
  "secretKey": "sk_test_51ABC123",
  "webhookSecret": "whsec_1ABC123",
  "testMode": true
}
```

**Step 3: Fetch Configuration**
```
GET http://localhost:5000/api/admin/stripe/config
Cookie: token=YOUR_TOKEN_HERE
```

### Method 3: Using cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"collegeadmin@testcollege.com","password":"TestPassword123!"}' \
  -c cookies.txt

# Save config
curl -X POST http://localhost:5000/api/admin/stripe/config \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "publishableKey": "pk_test_51ABC123",
    "secretKey": "sk_test_51ABC123",
    "webhookSecret": "whsec_1ABC123",
    "testMode": true
  }'

# Fetch config
curl -X GET http://localhost:5000/api/admin/stripe/config \
  -b cookies.txt
```

### Method 4: Using MongoDB

```javascript
// Verify database storage
use smart-college

// Find config for specific college
db.collegepaymentconfigs.findOne({ 
  collegeId: ObjectId("YOUR_COLLEGE_ID"),
  gatewayCode: "stripe"
})

// Expected output:
{
  "_id": ObjectId("65f1a2b3c4d5e6f7g8h9i0j1"),
  "collegeId": ObjectId("65f1a2b3c4d5e6f7g8h9i0j0"),
  "gatewayCode": "stripe",
  "credentials": {
    "keyId": "pk_test_51ABC123",
    "keySecret": "base64_encrypted_string_here...",  // ← Should be encrypted!
    "webhookSecret": "base64_encrypted_string_here..."
  },
  "configuration": {
    "currency": "INR",
    "enabled": true,
    "testMode": true
  },
  "isActive": true,
  "createdAt": ISODate("2026-03-18T09:00:00.000Z"),
  "updatedAt": ISODate("2026-03-18T10:30:00.000Z")
}
```

---

## 🐛 Debugging Guide

### Issue 1: "next is not a function"

**Cause:** Error thrown instead of calling `next(error)` in middleware.

**Solution:** Already fixed in `auth.middleware.js`:
```javascript
// ❌ Wrong
throw new AppError("Invalid token", 401, "INVALID_TOKEN");

// ✅ Correct
next(new AppError("Invalid token", 401, "INVALID_TOKEN"));
```

### Issue 2: "req.college_id is undefined"

**Cause:** Middleware not setting college_id properly.

**Debug Steps:**
1. Check console logs for `req.user` object
2. Verify user has `college_id` in JWT token
3. Check `checkCollegeAccess` middleware is applied

**Solution:**
```javascript
// In checkCollegeAccess middleware
req.college_id = req.user.college_id; // ← Ensure this line exists
```

### Issue 3: "Cannot encrypt empty or null text"

**Cause:** `ENCRYPTION_MASTER_KEY` not set in `.env`.

**Solution:**
```env
# Add to backend/.env
ENCRYPTION_MASTER_KEY=your-super-secret-encryption-key-min-16-chars
```

### Issue 4: "Publishable key and secret key are required"

**Cause:** Request body not parsed correctly.

**Debug Steps:**
1. Check `Content-Type: application/json` header
2. Verify request body format
3. Check `express.json()` middleware is applied

**Solution:**
```javascript
// In app.js (should already exist)
app.use(express.json());
```

### Issue 5: "Invalid Stripe publishable key format"

**Cause:** Key doesn't start with `pk_test_` or `pk_live_`.

**Solution:**
- Use test keys for testing: `pk_test_...`
- Use live keys for production: `pk_live_...`

---

## ✅ Verification Checklist

### Backend Verification

- [ ] `ENCRYPTION_MASTER_KEY` is set in `.env`
- [ ] Backend server starts without errors
- [ ] Console logs show `req.college_id` is populated
- [ ] Console logs show encryption is successful
- [ ] Database shows encrypted `keySecret` (base64 string)
- [ ] GET response does NOT expose secret keys

### Frontend Verification

- [ ] Login as college admin works
- [ ] Navigate to System Settings → Fee Settings → Stripe
- [ ] Form fields are visible
- [ ] Save Configuration button is clickable
- [ ] Success toast appears after saving
- [ ] Configuration is displayed after save
- [ ] Secret keys are not shown in network response

### Security Verification

- [ ] Secret keys are encrypted in database (base64)
- [ ] GET response excludes secret keys
- [ ] College A cannot access College B's config
- [ ] Non-admin users cannot access config endpoints
- [ ] Unauthenticated requests are rejected

---

## 📊 Expected Console Logs

### Successful Save Operation

```
🔵 [Stripe Config] Saving configuration
   - req.college_id: 65f1a2b3c4d5e6f7g8h9i0j1
   - req.user: {
       id: '65f1a2b3c4d5e6f7g8h9i0j2',
       role: 'COLLEGE_ADMIN',
       college_id: '65f1a2b3c4d5e6f7g8h9i0j1'
     }
   - Request body: {
       publishableKey: 'Present',
       secretKey: 'Present',
       webhookSecret: 'Present',
       testMode: true
     }
✅ Stripe configuration saved for college 65f1a2b3c4d5e6f7g8h9i0j1
```

### Successful Fetch Operation

```
🔵 [Stripe Config] Fetching configuration
   - req.college_id: 65f1a2b3c4d5e6f7g8h9i0j1
   - req.user: {
       id: '65f1a2b3c4d5e6f7g8h9i0j2',
       role: 'COLLEGE_ADMIN',
       college_id: '65f1a2b3c4d5e6f7g8h9i0j1'
     }
   - Config found: true
```

---

## 🎯 Success Criteria

Your Stripe configuration API is working correctly if:

1. ✅ College admin can save Stripe credentials
2. ✅ Credentials are encrypted before storage (check MongoDB)
3. ✅ GET response does not expose secret keys
4. ✅ Each college has isolated configuration
5. ✅ Unauthenticated requests are rejected
6. ✅ Non-admin users cannot access endpoints
7. ✅ `req.college_id` is properly populated from JWT

---

## 📞 Support

If you encounter issues:

1. Check server console logs for detailed errors
2. Run the test script: `node test-stripe-config.js`
3. Verify MongoDB data is correctly stored
4. Check network tab in browser DevTools
5. Ensure all environment variables are set

---

**Version:** 1.0.0  
**Last Updated:** March 2026
