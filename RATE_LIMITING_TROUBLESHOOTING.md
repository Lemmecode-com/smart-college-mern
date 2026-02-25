# 🔍 Rate Limiting Troubleshooting Guide

## Issue: Can Login More Than 5 Times

If you're able to make 6+ login attempts when the limit is set to 5, here's how to diagnose:

---

## ✅ Step 1: Verify Server Restarted

After adding rate limiting, you **must restart your backend server**:

```bash
# Stop the server (Ctrl+C)
# Then restart
cd backend
node server.js
```

---

## ✅ Step 2: Check Rate Limit Headers

When you make a login request, check the response headers:

### Using curl:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' \
  -i
```

Look for these headers in the response:
```
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 1708776000
```

### Using JavaScript (test-rate-limit.js):
```bash
npm install axios
node test-rate-limit.js
```

---

## ✅ Step 3: Test Rapidly (Within Time Window)

Rate limiting works within a **15-minute window**. If you wait too long between attempts, the counter resets.

**Correct testing:**
```bash
# Make 6-8 requests QUICKLY (within 1-2 minutes)
for i in {1..8}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "Request $i: %{http_code}\n" -o /dev/null -s
done
```

**Expected output:**
```
Request 1: 401
Request 2: 401
Request 3: 401
Request 4: 401
Request 5: 401
Request 6: 429  ← BLOCKED!
Request 7: 429
Request 8: 429
```

---

## ✅ Step 4: Check Server Logs

When rate limit is hit, you should see:

```
⚠️  RATE LIMIT HIT - Auth endpoint from IP: ::1
   Window: 15 minutes, Max: 5 requests
```

If you don't see this log, the rate limiter isn't being triggered.

---

## 🔧 Common Issues & Fixes

### Issue 1: IPv6 vs IPv4

Your IP might be `::1` (IPv6 localhost) or `127.0.0.1` (IPv4).

**Check:** Look at server logs to see which IP is being tracked.

**Fix:** The rate limiter tracks each IP separately. Stick to one when testing.

---

### Issue 2: Multiple Middleware Counters

If both `apiLimiter` and `authLimiter` apply, only one should count.

**Current setup:**
- `apiLimiter` applies to all `/api/*` routes (100 req/15min)
- `authLimiter` applies specifically to `/api/auth/login` (5 req/15min)

**How Express works:** Both middleware run, but the **first one to block** wins.

**Check:** The authLimiter (5 req) should trigger before apiLimiter (100 req).

---

### Issue 3: Browser/Postman Caching

Some tools cache responses or reuse connections.

**Fix:** 
- Use incognito/private mode in browser
- Clear Postman cache
- Use curl for testing

---

### Issue 4: Server Not Using Updated Code

**Check:** Add a console.log in your login controller:

```javascript
// In auth.controller.js
console.log('Login attempt received');
```

If you don't see this log, the request isn't reaching your controller.

---

## 🧪 Quick Test Script

Save this as `quick-test.bat` (Windows) or `quick-test.sh` (Mac/Linux):

### Windows (quick-test.bat):
```batch
@echo off
echo Testing rate limiting on login endpoint...
for /l %%i in (1,1,8) do (
  curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"wrong\"}" -w "Request %%i: HTTP Status: %%{http_code}\n" -o nul -s
)
echo Done! Request 6+ should return 429
```

### Mac/Linux (quick-test.sh):
```bash
#!/bin/bash
echo "Testing rate limiting on login endpoint..."
for i in {1..8}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "Request $i: HTTP Status: %{http_code}\n" \
    -o /dev/null -s
done
echo "Done! Request 6+ should return 429"
```

---

## 📊 Expected Behavior

| Request # | HTTP Status | RateLimit-Remaining | Description |
|-----------|-------------|---------------------|-------------|
| 1 | 401 | 4/5 | Wrong password |
| 2 | 401 | 3/5 | Wrong password |
| 3 | 401 | 2/5 | Wrong password |
| 4 | 401 | 1/5 | Wrong password |
| 5 | 401 | 0/5 | Wrong password |
| 6 | **429** | 0/5 | **BLOCKED - Rate limit exceeded** |
| 7 | 429 | 0/5 | BLOCKED |
| 8 | 429 | 0/5 | BLOCKED |

---

## 🎯 Still Not Working?

### Enable Debug Logging

Add this to `app.js` temporarily:

```javascript
// Log all requests to /api/auth/login
app.use((req, res, next) => {
  if (req.path.includes('/api/auth/login')) {
    console.log(`📍 Request to login from IP: ${req.ip}`);
    console.log(`   Path: ${req.path}`);
    console.log(`   Method: ${req.method}`);
  }
  next();
});
```

### Check Middleware Order

In `app.js`, verify the order is:
1. Security middleware
2. CORS
3. Cookie parser
4. **Rate limiters**
5. JSON parser
6. Routes

---

## 💡 Understanding the 6th Request

**Important:** The rate limiter blocks on the **6th request**, not after the 5th.

```
Request 1 ✅ (count: 1/5)
Request 2 ✅ (count: 2/5)
Request 3 ✅ (count: 3/5)
Request 4 ✅ (count: 4/5)
Request 5 ✅ (count: 5/5) - Last allowed request
Request 6 ❌ BLOCKED (count: 6/5 - EXCEEDS LIMIT!)
```

So you should see:
- **5 requests succeed** (but fail with 401 for wrong password)
- **6th request is blocked** (returns 429)

---

## ✅ Success Criteria

Rate limiting is working correctly if:
- [ ] First 5 login attempts return 401 (wrong password)
- [ ] 6th login attempt returns 429 (rate limited)
- [ ] Server logs show "RATE LIMIT HIT" message
- [ ] Response includes `RateLimit-Limit: 5` header

---

**Last Updated:** Monday, 23 February 2026
