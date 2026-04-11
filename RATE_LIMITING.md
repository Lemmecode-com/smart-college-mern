# Rate Limiting Documentation

## Overview

Rate limiting is implemented using `express-rate-limit` to prevent API abuse and ensure fair usage. The system now tracks requests by **User Identity** (for authenticated users) or **IP Address** (for unauthenticated requests).

---

## Configuration

### Environment Variables

Located in `backend/.env`:

```env
# Environment: development or production
NODE_ENV=development

# Rate Limiting Configuration (Production Settings)
RATE_LIMIT_WINDOW_MS=300000      # 5 minutes (in milliseconds)
RATE_LIMIT_MAX_REQUESTS=1000     # Maximum requests per window
```

### How Environment Detection Works

The system checks `process.env.NODE_ENV` to determine which limits to apply:

- **`NODE_ENV=development`**: Applies development-specific limits
- **`NODE_ENV=production`** (or anything else): Applies production limits

---

## Tracking Method

### Authenticated Users
When a user is logged in, rate limiting tracks by their **User ID**:
```
Key: user:{userId}
Example: user:699c0f99cc496e694bae39c6
```

**Benefits:**
- Persists across IP changes (mobile networks, VPN)
- Prevents users from bypassing limits by changing IPs
- Fair limits per user account

### Unauthenticated Requests
For requests without authentication, rate limiting tracks by **IP Address**:
```
Key: ip:{normalizedIp}
Example: ip:127.0.0.1
```

### Always IP-Based (Even When Authenticated)
These endpoints always track by IP because users are not authenticated yet:
- Login (`POST /api/auth/login`)
- Password Reset (`POST /api/auth/forgot-password`)

### Special Case: Webhooks
Webhook endpoints use **Stripe signature** if available, fallback to IP:
```
Key: stripe:{signature_hash} (if Stripe signature present)
Key: ip:{normalizedIp} (otherwise)
```

---

## Rate Limit Configuration

### Development Mode (`NODE_ENV=development`)

| Limiter | Window | Max Requests | Applied To |
|---|---|---|---|
| **Global** | 1 minute | 1,000 | All `/api/*` routes (catch-all) |
| **Auth (Login)** | 1 minute | 30 | `POST /api/auth/login`, `POST /api/auth/verify-otp-reset` |
| **Password Reset** | 1 minute | 5 | `POST /api/auth/forgot-password` |
| **Payment** | 1 minute | 30 | Payment creation endpoints |
| **Payment Polling** | 1 minute | 500 | Payment status checks |
| **Health Check** | 1 minute | 60 | `GET /health-check` |
| **Public Routes** | 1 minute | 100 | `/api/public/*` |
| **Webhooks** | 1 minute | 200 | Stripe/Razorpay webhook endpoints |

### Production Mode (`NODE_ENV=production`)

| Limiter | Window | Max Requests | Applied To |
|---|---|---|---|
| **Global** | 5 minutes | 1,000 | All `/api/*` routes (catch-all) |
| **Auth (Login)** | 15 minutes | 5 | `POST /api/auth/login`, `POST /api/auth/verify-otp-reset` |
| **Password Reset** | 1 hour | 3 | `POST /api/auth/forgot-password` |
| **Payment** | 5 minutes | 20 | Payment creation endpoints |
| **Payment Polling** | 5 minutes | 200 | Payment status checks |
| **Health Check** | 1 minute | 60 | `GET /health-check` |
| **Public Routes** | 5 minutes | 50 | `/api/public/*` |
| **Webhooks** | 5 minutes | 500 | Stripe/Razorpay webhook endpoints |

---

## Rate Limiter Details

### 1. Global Limiter
**File:** `backend/src/middlewares/rateLimit.middleware.js` (lines 47-70)

- **Applies to:** All `/api/*` routes not covered by other limiters
- **Tracking:** User ID (authenticated) or IP (unauthenticated)
- **Development:** 1,000 requests per 1 minute
- **Production:** 1,000 requests per 5 minutes

**Covered Routes:**
```
/api/college/*
/api/master/*
/api/departments/*
/api/courses/*
/api/teachers/*
/api/subjects/*
/api/students/*
/api/users/*
/api/timetable/*
/api/attendance/*
/api/reports/*
/api/dashboard/*
/api/notifications/*
/api/security-audit/*
/api/audit-logs/*
/api/promotion/*
/api/document-config/*
```

### 2. Auth Limiter
**File:** `backend/src/middlewares/rateLimit.middleware.js` (lines 76-111)

- **Applies to:** `POST /api/auth/login`, `POST /api/auth/verify-otp-reset`
- **Tracking:** Always IP address
- **Development:** 30 requests per 1 minute
- **Production:** 5 requests per 15 minutes

**Why IP-only:** Users are not authenticated when logging in, so we must track by IP.

### 3. Password Reset Limiter
**File:** `backend/src/middlewares/rateLimit.middleware.js` (lines 117-152)

- **Applies to:** `POST /api/auth/forgot-password`
- **Tracking:** Always IP address
- **Development:** 5 requests per 1 minute
- **Production:** 3 requests per 1 hour

**Why strict:** Prevents email spam and abuse of password reset functionality.

### 4. Payment Limiter
**File:** `backend/src/middlewares/rateLimit.middleware.js` (lines 158-193)

- **Applies to:** `/api/stripe/*`, `/api/admin/payments/*`, `/api/fees/structure/*`
- **Tracking:** User ID (authenticated) or IP (unauthenticated)
- **Development:** 30 requests per 1 minute
- **Production:** 20 requests per 5 minutes

### 5. Payment Status Polling Limiter
**File:** `backend/src/middlewares/rateLimit.middleware.js` (lines 199-211)

- **Applies to:** Payment status polling endpoints (defined but not currently applied)
- **Tracking:** User ID (authenticated) or IP (unauthenticated)
- **Development:** 500 requests per 1 minute
- **Production:** 200 requests per 5 minutes

**Why high limit:** Frontend frequently polls (every 2-3 seconds) for payment status.

### 6. Health Check Limiter
**File:** `backend/src/middlewares/rateLimit.middleware.js` (lines 217-228)

- **Applies to:** `GET /health-check`
- **Tracking:** Always IP address
- **All environments:** 60 requests per 1 minute

### 7. Public Routes Limiter
**File:** `backend/src/middlewares/rateLimit.middleware.js` (lines 234-249)

- **Applies to:** `/api/public/*`
- **Tracking:** Always IP address
- **Development:** 100 requests per 1 minute
- **Production:** 50 requests per 5 minutes

### 8. Webhook Limiter
**File:** `backend/src/middlewares/rateLimit.middleware.js` (lines 255-296)

- **Applies to:** `/api/stripe/webhook`, `/api/razorpay/webhook`
- **Tracking:** Stripe signature (if present) or IP address
- **Development:** 200 requests per 1 minute
- **Production:** 500 requests per 5 minutes

**Why high limit:** Payment providers may retry failed webhooks.

### 9. API Limiter (General Purpose)
**File:** `backend/src/middlewares/rateLimit.middleware.js` (lines 234-246)

- **Applies to:** Not currently applied to any route
- **Tracking:** User ID (authenticated) or IP (unauthenticated)
- **All environments:** 100 requests per 5 minutes

---

## Middleware Application Order

**File:** `backend/app.js`

Rate limiters are applied in this order:

```javascript
1. /api/stripe/webhook        → webhookLimiter (line 54)
2. /health-check              → healthCheckLimiter (line 63)
3. /api/public                → publicLimiter (line 64)
4. /api/stripe                → paymentLimiter (line 65)
5. /api/admin/payments        → paymentLimiter (line 66)
6. /api/fees/structure        → paymentLimiter (line 67)
7. /api/* (catch-all)         → globalLimiter (line 71)
8. /api/auth/*                → authLimiter (in auth.routes.js)
9. /api/razorpay/webhook      → webhookLimiter (line 133)
```

**Note:** Specific limiters are applied BEFORE the global limiter to avoid double-counting.

---

## Response Format

### Success Response Headers
When rate limiting is active, responses include standard headers:

```
RateLimit-Limit: 1000          // Maximum requests allowed
RateLimit-Remaining: 995       // Requests remaining in window
RateLimit-Reset: 1712851200    // When the window resets (Unix timestamp)
```

### Rate Limit Exceeded Response (HTTP 429)

```json
{
  "success": false,
  "message": "Too many requests, please slow down (Development Mode)",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**Production message:**
```json
{
  "success": false,
  "message": "Too many requests, please try again after 5 minutes",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## IP Normalization

The system normalizes IP addresses to handle IPv6-mapped IPv4 addresses:

```javascript
// Example transformations
::ffff:127.0.0.1  →  127.0.0.1
::ffff:192.168.1.5  →  192.168.1.5
```

**Proxy Configuration:**
```javascript
app.set("trust proxy", 1);  // app.js line 22
```

This ensures Express gets the **original client IP** from `X-Forwarded-For` headers when behind a proxy (Nginx, Cloudflare, etc.).

---

## Logging

When rate limits are hit, detailed logs are generated:

### Example Log Output
```
RATE LIMIT HIT - Global from User:699c0f99cc496e694bae39c6
{
  "identifier": "699c0f99cc496e694bae39c6",
  "type": "user",
  "endpoint": "/api/students"
}
```

**For IP-based:**
```
RATE LIMIT HIT - Auth endpoint from IP: ::1
{
  "ip": "::1",
  "window": "15 minutes",
  "max": 5,
  "endpoint": "auth"
}
```

---

## OTP-Level Rate Limiting (Separate System)

**File:** `backend/src/services/otp.service.js` (lines 141-162)

In addition to IP/user-based rate limiting, OTP generation has its own database-level limit:

- **Maximum:** 3 OTPs per email per hour
- **Tracking:** By email address (database query)
- **Independent:** This is separate from express-rate-limit middleware

---

## Frontend Integration

### Rate Limit Handler
**File:** `frontend/src/utils/rateLimitHandler.js`

- Exponential backoff starting at 30 seconds, max 5 minutes
- Per-category backoff state (`global`, `notifications`, `data`)
- `safeApiCall()` wrapper auto-detects 429 responses

### UI Components
- **Navbar.jsx**: Prevents repeated API calls during backoff
- **ApiError.jsx**: Displays 429 errors with countdown timer
- **ForgotPassword.jsx**: Handles `RATE_LIMIT_EXCEEDED` error code

---

## Testing

### Quick Configuration Test
```bash
cd backend
node test-rate-limits.js
```

This script displays your current rate limiting configuration based on `.env` settings.

### Manual API Testing (PowerShell)

**Test auth rate limit:**
```powershell
for ($i=1; $i -le 35; $i++) {
  $response = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' `
    -Method POST `
    -Body '{"email":"test@test.com","password":"wrong"}' `
    -ContentType 'application/json' `
    -ErrorAction SilentlyContinue
  if ($response.code -eq "RATE_LIMIT_EXCEEDED") {
    Write-Host "Rate limited at request $i!" -ForegroundColor Red
    break
  }
  Write-Host "Request $i: OK" -ForegroundColor Green
}
```

**Expected in development:** Rate limit hit after ~30 requests

### Switching to Production Mode

1. Edit `backend/.env`:
   ```env
   NODE_ENV=production
   ```

2. Restart the server:
   ```bash
   npm run dev
   ```

3. All rate limiters will now use production settings.

---

## Migration from Old to New System

### What Changed

| Aspect | Before | After |
|---|---|---|
| **Tracking** | IP address only | User ID (authenticated) or IP (unauthenticated) |
| **Production Window** | 15 minutes | 5 minutes |
| **Production Global Max** | 100 requests | 1,000 requests |
| **Configurable** | Partially (some hardcoded) | Fully (via `.env`) |

### Benefits

✅ **User-based tracking:** Users can't bypass limits by changing IPs  
✅ **Higher production limits:** 10x more requests allowed (1,000 vs 100)  
✅ **Shorter windows:** 5 minutes instead of 15 (faster recovery)  
✅ **Better logging:** Shows whether limit hit by user or IP  
✅ **Fully configurable:** All limits adjustable via environment variables  

---

## Best Practices

### For Development
- Keep `NODE_ENV=development` in `.env`
- Limits are relaxed for easier testing
- If you hit limits during testing, you can temporarily increase `DEV_MAX_REQUESTS`

### For Production
- Set `NODE_ENV=production`
- Monitor rate limit hits in logs
- If legitimate users hit limits, consider increasing `RATE_LIMIT_MAX_REQUESTS`
- For multi-server deployments, use Redis-backed rate limiting (future enhancement)

### Security Considerations
- Auth endpoints always track by IP (prevents login bombing)
- Password reset is very strict (3 per hour) to prevent email spam
- Webhook limits accommodate payment provider retries
- OTP has separate database-level limiting

---

## Troubleshooting

### Issue: Not seeing rate limit logs
**Reason:** You're below the threshold. In development, you need 1,000+ requests per minute.

**Solution:** Run the manual testing script above, or temporarily lower limits.

### Issue: Rate limiting not working behind proxy
**Check:** 
1. `app.set("trust proxy", 1)` is present in `app.js`
2. Proxy is forwarding `X-Forwarded-For` header correctly

### Issue: Different users sharing the same limit
**Check:** Authentication middleware is attaching `req.user` before rate limiter runs. The rate limiter must be applied AFTER authentication.

---

**Last Updated:** April 11, 2026  
**Maintained By:** SmartCollege Development Team
