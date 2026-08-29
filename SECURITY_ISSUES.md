# Security Issues Found in Smart College MERN Project

> **Generated:** 2026-06-01
> **Scope:** User Management & Authentication Module

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 1     |
| MEDIUM   | 7     |
| LOW      | 2     |

---

## Issues

### 1. Content Security Policy Disabled

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| HIGH                                   |
| **File**    | `backend/src/middlewares/security.middleware.js:12` |
| **Status**  | Not Fixed                              |

**Description:**
`contentSecurityPolicy: false` in Helmet.js configuration disables XSS protection entirely. If an attacker finds a DOM-based XSS vulnerability, they can read HttpOnly cookies and bypass all authentication protections.

**Impact:** Session hijacking via XSS, account takeover, data exfiltration.

**Recommendation:** Enable CSP with a restrictive policy in production:
```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-{random}'"],
    styleSrc: ["'self'", "'nonce-{random}'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://api.your-college.com"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  }
}
```

---

### 2. Student Password Minimum 6 Chars vs Staff 8 Chars

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| MEDIUM                                 |
| **File**    | `backend/src/middlewares/validators/student.validator.js:50` vs `backend/src/controllers/auth.controller.js:467` |
| **Status**  | Not Fixed                              |

**Description:**
Student registration allows passwords with only 6 characters, while `changePassword` enforces 8 characters for staff/admin users. This inconsistency weakens security for student accounts.

**Impact:** Brute-force attacks on student accounts are easier due to shorter password length.

**Recommendation:** Standardize to minimum 8 characters across all user types. Consider adding complexity requirements (uppercase, lowercase, number, special character).

---

### 3. No Rate Limiting on `/refresh` Endpoint

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| MEDIUM                                 |
| **File**    | `backend/src/routes/auth.routes.js:13` |
| **Status**  | Not Fixed                              |

**Description:**
`POST /api/auth/refresh` has no rate limiter. An attacker can attempt to brute-force refresh tokens at unlimited speed. While refresh tokens are hashed in the DB, the endpoint still processes JWT verification which is computationally expensive.

**Impact:** Potential DoS via token brute-forcing, or token enumeration attacks.

**Recommendation:** Add `authLimiter` to this route:
```javascript
router.post("/refresh", authLimiter, refreshToken);
```

---

### 4. No Rate Limiting on `change-password` Endpoint

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| MEDIUM                                 |
| **File**    | `backend/src/routes/auth.routes.js:100` |
| **Status**  | Not Fixed                              |

**Description:**
`POST /api/auth/change-password` has no rate limiter. An attacker who has access to a victim's session (stolen token) or is trying to brute-force the current password can make unlimited attempts.

**Impact:** Password brute-force attacks, account takeover.

**Recommendation:** Add `authLimiter` to this route:
```javascript
router.post("/change-password", auth, authLimiter, changePassword);
```

---

### 5. No Account Lockout After Failed Logins

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| MEDIUM                                 |
| **File**    | `backend/src/middlewares/rateLimit.middleware.js:75-106` |
| **Status**  | Not Fixed                              |

**Description:**
The auth limiter blocks IP after 5 failed attempts in 15 minutes. However, attackers using botnets or rotating IPs can still perform targeted account attacks indefinitely. There is no per-account lockout mechanism.

**Impact:** Targeted brute-force attacks on specific accounts remain viable.

**Recommendation:** Implement per-account lockout:
- Track failed login attempts per account in User collection (`loginAttempts`, `lockedUntil`)
- Lock account for 15 minutes after 5 failed attempts

---

### 6. Duplicate College Middleware Causing Protection Gaps

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| MEDIUM                                 |
| **File**    | `backend/src/middlewares/college.middleware.js` + `backend/src/middlewares/collegeIsolation.middleware.js` |
| **Status**  | Partial Fix                            |

**Description:**
Two middlewares exist:
- `college.middleware.js` — basic college_id validation
- `collegeIsolation.middleware.js` — enhanced with subscription expiry, role validation, and isolation violation detection

However, `user.routes.js` only uses the basic `collegeMiddleware`, missing enhanced checks like subscription expiry validation and role-based access control.

**Impact:** Users from expired colleges can still deactivate/reactivate users; role-based checks are bypassed.

**Recommendation:** Use `collegeIsolation` middleware for all sensitive routes, or merge both into a single robust middleware.

---

### 7. OTP Stored in Plaintext in Database

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| MEDIUM                                 |
| **File**    | `backend/src/services/otp.service.js:47` |
| **Status**  | Not Fixed                              |

**Description:**
`PasswordReset.create({ otp, ... })` stores the OTP as plaintext. If the MongoDB database is breached, all active OTPs are immediately exposed, allowing attackers to reset passwords for any user with an active OTP.

**Impact:** Database breach leads to mass account takeover via active OTPs.

**Recommendation:** Hash OTPs before storage:
```javascript
const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
await PasswordReset.create({
  email,
  otp: hashedOTP,
  expiresAt,
  isUsed: false,
});
```
And verify by hashing the input OTP before comparison.

---

### 8. No Password Complexity Requirements

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| MEDIUM                                 |
| **File**    | `backend/src/middlewares/validators/student.validator.js`, `backend/src/utils/validators.js` |
| **Status**  | Not Fixed                              |

**Description:**
Validators only check minimum password length (6 or 8 chars). There are no requirements for uppercase letters, lowercase letters, numbers, or special characters. This allows weak passwords like `password123` or `abcdefgh`.

**Impact:** Weak passwords are vulnerable to dictionary attacks and credential stuffing.

**Recommendation:** Add complexity validator:
```javascript
body("password")
  .isLength({ min: 8 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  .withMessage("Password must contain uppercase, lowercase, number, and special character")
```

---

### 9. Security Audit Using `console.log`/`console.error`

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| LOW                                    |
| **File**    | `backend/src/services/securityAudit.service.js:16-17, 23, 40-46` |
| **Status**  | Not Fixed                              |

**Description:**
Security audit service logs sensitive data (user emails, IP addresses, endpoints, full event objects) directly to `console.log` and `console.error`. In production, these logs may be captured by monitoring tools, log aggregators, or error reporting services, creating a data leak.

**Impact:** Sensitive PII (emails, IPs) may be exposed in third-party logging systems.

**Recommendation:** Replace `console.log`/`console.error` with the existing structured `logger` utility, and ensure sensitive fields are redacted in production.

---

### 10. `/auth/me` Endpoint Leaks Student-User ID Mapping

| Field       | Value                                  |
|-------------|----------------------------------------|
| **Severity**| LOW                                    |
| **File**    | `backend/src/routes/auth.routes.js:16-91` |
| **Status**  | Accepted Risk - Deferred to V2 |

**Description:**
The `/auth/me` endpoint returns the authenticated user's `id`, which for students maps to `Student.user_id` (a User collection ObjectId). This allows enumeration of Student ↔ User `_id` mappings. Combined with other endpoints, this could be used for IDOR (Insecure Direct Object Reference) attacks.

**Impact:** Information disclosure enabling targeted attacks on student records.

**Recommendation:** Return a non-guessable public identifier instead of internal ObjectIds, or do not expose internal MongoDB ObjectIds to the frontend.

---

## Recommendations Priority

| Priority | Action |
|----------|--------|
| P0 (Immediate) | Enable Content Security Policy |
| P0 (Immediate) | Hash OTPs before database storage |
| P1 (This Sprint) | Standardize password policy to 8+ chars with complexity |
| P1 (This Sprint) | Add rate limiting to `/refresh` and `/change-password` |
| P2 (Next Sprint) | Implement per-account lockout mechanism |
| P2 (Next Sprint) | Replace `console.log` with structured logger |
| P3 (Backlog) | Issue opaque public IDs instead of ObjectIds |

---

## Compliance Notes

| Standard | Relevance |
|----------|-----------|
| OWASP Top 10 | Broken Authentication (#7), Broken Access Control (#5), Security Misconfiguration (#6) |
| DPDPA 2026 | Data protection impact from OTP plaintext storage, audit log PII exposure |
| PCI DSS | If payment routes are affected by middleware inconsistencies |
