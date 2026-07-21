# LOGIN-09: Session Management Implementation Plan

## Executive Summary

Implement enterprise-grade session management supporting both "Allow Multiple Logins" and "Restricted – Single Session" modes, with proper session invalidation, professional UX, and zero authentication crashes.

---

## PLAN PHASE 1: Architecture

### Option Comparison

| Option | Description | Pros | Cons | Fit |
|--------|-------------|------|------|-----|
| **A: activeSessionId** | Single field on User storing current session ID | Simple, minimal schema change, fits existing tokenVersion pattern | Requires sessionId in JWT, limited audit history | ✅ **RECOMMENDED** |
| **B: tokenVersion bump** | Bump version to invalidate ALL sessions | Already partially implemented, trivial | Too aggressive — kills all sessions including allowed ones | ❌ |
| **C: Session collection** | Dedicated Session model with full lifecycle | Rich audit, device tracking, expiry management | New model, more queries, overkill for restricted mode | ⚠️ Supplemental |
| **D: Device-based** | Track devices per user, manage per-device | Maximum control, enterprise-grade | Complex, requires device registry, high maintenance | ❌ Overkill |

### Recommended Design: **Hybrid A + C**

- **User.activeSessionId**: Single string field for single-session enforcement
- **RefreshToken.sessionId**: String field linking token to a logical session
- **Session model** (new): Audit trail for active/inactive sessions with device metadata

**Why this fits the project:**
- `tokenVersion` already exists on User — `activeSessionId` follows the same pattern
- RefreshToken already stores `userAgent` and `ipAddress` — adding `sessionId` is a natural extension
- The middleware already queries User on every request — one extra field read is negligible
- Minimal schema changes, backward compatible, testable in phases

---

## PLAN PHASE 2: Database Changes

### New Fields

#### User Model (`backend/src/models/user.model.js`)
```javascript
activeSessionId: {
  type: String,
  default: null,
  index: true
}
```

#### RefreshToken Model (`backend/src/models/refreshToken.model.js`)
```javascript
sessionId: {
  type: String,
  required: true,
  index: true
}
```

#### College Model (`backend/src/models/college.model.js`)
```javascript
allowMultipleLogins: {
  type: String,
  enum: ["allowed", "restricted"],
  default: "restricted"
}
```

### New Model: Session (`backend/src/models/session.model.js`)
```javascript
{
  user_id: ObjectId (ref User),
  sessionId: String (unique),
  college_id: ObjectId (ref College),
  userAgent: String,
  ipAddress: String,
  isActive: { type: Boolean, default: true },
  lastActivityAt: Date,
  expiresAt: Date,
  revokedAt: Date,
  revokeReason: String
}
```

### Indexes
- `User.activeSessionId` — for middleware lookup
- `RefreshToken.sessionId` — for session validation
- `RefreshToken.{user_id, isRevoked}` — existing, keep
- `Session.{user_id, isActive}` — for active session queries
- `Session.sessionId` — unique, for direct lookup

### Migration Requirements
- Add `activeSessionId` to User with default `null` — existing users have no active session
- Add `sessionId` to RefreshToken — existing tokens get `null` or generated UUID
- Add `allowMultipleLogins` to College with default `"restricted"` — preserves current behavior
- New Session collection starts empty

### Backward Compatibility
- All new fields are nullable/optional with safe defaults
- Existing JWTs without `sessionId` pass middleware (migration path handles them)
- No breaking changes to existing API contracts

---

## PLAN PHASE 3: Backend Implementation

### Authentication Controller (`auth.controller.js`)

#### `sendTokens(res, id, role, college_id, tokenVersion, req)`
- Generate `sessionId` (UUID v4 or nanoid)
- Include `sessionId` in access token JWT payload: `{ id, role, college_id, tokenVersion, sessionId }`
- Include `sessionId` in refresh token JWT payload
- Store `sessionId` in RefreshToken document
- If `allowMultipleLogins === "restricted"`:
  - Revoke all existing refresh tokens for user (`isRevoked: true`)
  - Set `user.activeSessionId = sessionId`
  - Blacklist previous access tokens (optional, for immediate effect)
- If `allowMultipleLogins === "allowed"`:
  - Do NOT modify `activeSessionId`
  - Do NOT revoke existing tokens
- Create Session document with device metadata

#### `logout(req, res)`
- Extract `sessionId` from access token JWT
- Revoke the specific refresh token matching `sessionId`
- Set `user.activeSessionId = null` only if the logged-out session matches
- Blacklist access token (existing behavior)
- Mark Session as `isActive: false`, `revokedAt: now`, `revokeReason: "LOGOUT"`

#### `refreshToken(req, res)`
- Extract `sessionId` from new access token
- If user has `activeSessionId` and it doesn't match `sessionId` → reject with `SESSION_INVALIDATED`
- Otherwise, issue new access token with same `sessionId`

#### `changePassword(req, res)` / `verifyOTPAndResetPassword(req, res)`
- Keep existing `tokenVersion` bump behavior
- ALSO clear `user.activeSessionId = null`
- Revoke ALL refresh tokens for user (existing behavior)
- This ensures password change invalidates all sessions regardless of mode

### Auth Middleware (`middlewares/auth.middleware.js`)

Add after `isActive` check:
```javascript
// Session enforcement
if (decoded.sessionId && user.activeSessionId) {
  if (decoded.sessionId !== user.activeSessionId) {
    return next(new AppError(
      "Session invalidated. Please login again.",
      401,
      "SESSION_INVALIDATED"
    ));
  }
}
```

Behavior matrix:
| `allowMultipleLogins` | `user.activeSessionId` | Token `sessionId` | Result |
|----------------------|------------------------|-------------------|--------|
| `allowed` | `null` | any | ✅ Pass |
| `allowed` | set (edge case) | matches | ✅ Pass |
| `allowed` | set (edge case) | mismatch | ✅ Pass (allowed mode ignores) |
| `restricted` | `null` | any | ✅ Pass (no active session) |
| `restricted` | set | matches | ✅ Pass |
| `restricted` | set | mismatch | ❌ `SESSION_INVALIDATED` |

### Session Model (`models/session.model.js`)
- New file
- Schema as defined in Phase 2
- TTL index on `expiresAt`

### General Settings API
- Add `GET /api/settings/general` — returns college settings including `allowMultipleLogins`
- Add `PUT /api/settings/general` — updates college settings
- Protected to `COLLEGE_ADMIN` and `SUPER_ADMIN`
- College Admin sees only their college's settings

### Configuration
- `allowMultipleLogins` read from College document on login
- Cached in memory? No — read fresh from DB on each login (low frequency)
- Passed to `sendTokens` via `req` context or direct query

---

## PLAN PHASE 4: Frontend Implementation

### Axios Interceptor (`api/axios.js`)

**Response interceptor changes:**
- On `401` with code `SESSION_INVALIDATED`:
  - Dispatch custom event `session-invalidated` on `window`
  - Call `AuthContext.logout()`
  - Show toast: "Your session was terminated. Please login again."
- On `401` with code `TOKEN_INVALIDATED` (password change):
  - Same handling as above
- On `401` with code `TOKEN_BLACKLISTED`:
  - Same handling

### AuthContext (`auth/AuthContext.jsx`)

**New state:**
```javascript
const [sessionInvalidated, setSessionInvalidated] = useState(false);
```

**New effect:**
```javascript
useEffect(() => {
  const handler = () => setSessionInvalidated(true);
  window.addEventListener('session-invalidated', handler);
  return () => window.removeEventListener('session-invalidated', handler);
}, []);
```

**Modified login:**
- After successful login, check response for `sessionMode` or fetch settings
- If restricted mode and user already has active session elsewhere, show info toast: "Your previous session has been terminated"

**Modified logout:**
- Set `sessionInvalidated` to `false` on clean logout
- On forced logout (session invalidated), redirect to `/login?reason=session-expired`

**Session restore (`/auth/me`):**
- On `401` during restore, set `sessionInvalidated = true` if code is `SESSION_INVALIDATED`

### SessionExpired UI

**New component: `SessionExpired.jsx`**
```jsx
// Route: /session-expired
// Shows:
// - Icon: shield/exclamation
// - Title: "Session Expired"
// - Message: "Your session was terminated because..."
// - Button: "Go to Login"
// - Optional: "This can happen when you login from another device"
```

**Routing:**
- Add `/session-expired` route in App.jsx (public route)
- AuthContext redirects to this route when `sessionInvalidated` is true

### ProtectedRoute (`components/ProtectedRoute.jsx`)

- Add check for `sessionInvalidated`
- If true, redirect to `/session-expired` instead of `/login`

### Cross-Tab Synchronization

**BroadcastChannel:**
```javascript
const bc = new BroadcastChannel('auth_sync');
// On session invalidation: bc.postMessage({ type: 'SESSION_KILLED' })
// On other tabs: bc.onmessage → trigger logout + redirect
```

**Storage fallback (for older browsers):**
- `localStorage.setItem('auth_sync', JSON.stringify({...}))`
- `window.addEventListener('storage', handler)`

### General Settings Page (`GeneralSetting.jsx`)

**Changes:**
- Fetch `allowMultipleLogins` from backend API on mount
- On save, `PUT` to `/api/settings/general`
- Show loading state during fetch
- Display current setting with proper label
- The select component already exists — wire it to real API

### Cookie & Storage Handling

**No changes to cookie strategy** — httpOnly cookies remain the same.

**sessionStorage:**
- `userId` for first-login password change already exists — keep
- Add `sessionId` storage only if needed for client-side tracking (not required for backend enforcement)

### Navigation

- After session expiration, navigate to `/session-expired` with reason
- From `/session-expired`, button navigates to `/login`
- Prevent infinite redirect loops using state flags

### Logout Flow

**Current flow:** POST `/auth/logout` → clear cookies → setUser(null)

**New flow:**
- Clean logout: POST `/auth/logout` → backend revokes token + clears activeSessionId → frontend clears state → redirect `/login`
- Session-invalidated logout: `401 SESSION_INVALIDATED` → frontend broadcasts to tabs → all tabs clear state → redirect `/session-expired`

---

## PLAN PHASE 5: Authentication Flow

### Normal Login (Multiple Logins Allowed)
```
User submits credentials
    ↓
Backend validates
    ↓
generate sessionId (UUID)
    ↓
Create access token { ..., sessionId }
Create refresh token { ..., sessionId }
Store RefreshToken with sessionId
Create Session document
Set cookies (httpOnly)
    ↓
Return success + user info
    ↓
Frontend: setUser(user)
```

### Normal Login (Restricted – Single Session)
```
User submits credentials
    ↓
Backend validates
    ↓
Check: user.activeSessionId exists?
    ↓ YES
Revoke ALL existing RefreshTokens for user
Blacklist previous access tokens (optional)
Set user.activeSessionId = null (prepare for new)
    ↓
generate new sessionId (UUID)
    ↓
Create access token { ..., sessionId }
Create refresh token { ..., sessionId }
Store RefreshToken with sessionId
Create Session document
Set user.activeSessionId = sessionId
Set cookies (httpOnly)
    ↓
Return success + user info
    ↓
Frontend: setUser(user)
[Previous tab receives 401 → SESSION_INVALIDATED → SessionExpired screen]
```

### Request Validation (Every API Call)
```
Request arrives with access token cookie
    ↓
Auth Middleware:
  1. Decode JWT → { id, role, college_id, tokenVersion, sessionId }
  2. Check TokenBlacklist → pass
  3. Check tokenVersion vs User.tokenVersion → pass
  4. Check User.isActive → pass
  5. NEW: If User.activeSessionId exists AND sessionId !== activeSessionId
     → 401 SESSION_INVALIDATED
   ↓
Attach req.user → next()
```

### Token Refresh
```
POST /auth/refresh with refreshToken cookie
    ↓
Find RefreshToken by hashed token
    ↓
Check isRevoked, expiresAt → pass
    ↓
NEW: Check decoded.sessionId vs User.activeSessionId
     If restricted mode and mismatch → 401 SESSION_INVALIDATED
    ↓
Issue new access token with same sessionId
    ↓
Set cookie
```

### Logout
```
POST /auth/logout
    ↓
Extract sessionId from access token JWT
    ↓
Revoke RefreshToken where sessionId matches
Set User.activeSessionId = null (only if this was the active session)
Blacklist access token
Clear cookies
    ↓
Return success
    ↓
Frontend: setUser(null) → redirect /login
```

### Second Login (Same User, Different Device)
```
Device A: has active session, activeSessionId = "sess-A"
    ↓
Device B: login same user
    ↓
Restricted mode: revoke Device A's refresh token
                clear Device A's activeSessionId (logical)
                set new activeSessionId = "sess-B"
    ↓
Device B: gets new tokens with sessionId = "sess-B"
    ↓
Device A: next API call → middleware sees sessionId "sess-A"
          User.activeSessionId = "sess-B"
          Mismatch → 401 SESSION_INVALIDATED
    ↓
Device A: BroadcastChannel triggers → SessionExpired screen
```

---

## PLAN PHASE 6: Configuration Flow

### Database
- `College.allowMultipleLogins`: `"allowed" | "restricted"` — default `"restricted"`
- Read on every login request
- No caching required (login frequency is low)

### API
- `GET /api/settings/general` — returns college settings (auth required)
- `PUT /api/settings/general` — updates settings (COLLEGE_ADMIN, SUPER_ADMIN)
- Settings include: `allowMultipleLogins`, `passwordExpiryDays`, etc.

### Frontend
- `GeneralSetting.jsx` fetches current value on mount
- Select component posts update on save
- Visual indicator shows current mode

### Backend Enforcement
```javascript
// In login controller
const college = await College.findById(user.college_id).select('allowMultipleLogins');
const mode = college?.allowMultipleLogins || 'restricted';

if (mode === 'restricted') {
  await RefreshToken.updateMany(
    { user_id: id, isRevoked: false },
    { isRevoked: true, revokedAt: new Date(), revokeReason: 'SINGLE_SESSION' }
  );
  user.activeSessionId = sessionId;
  await user.save();
}
// mode === 'allowed': no revocation, no activeSessionId change
```

### Middleware Enforcement
```javascript
// Only enforce if restricted mode is configured
const college = await College.findById(user.college_id).select('allowMultipleLogins');
if (college?.allowMultipleLogins === 'restricted' && user.activeSessionId) {
  if (decoded.sessionId !== user.activeSessionId) {
    return next(new AppError("Session invalidated", 401, "SESSION_INVALIDATED"));
  }
}
```

**Note:** For performance, consider caching `allowMultipleLogins` per college in memory (LRU cache, 5-minute TTL) since it rarely changes.

---

## PLAN PHASE 7: Migration Strategy

### Existing Users
- `activeSessionId` defaults to `null` — existing users have no active session
- On next login, they receive a `sessionId` normally
- No forced logout required

### Old Refresh Tokens
- Existing RefreshToken documents have `sessionId: null`
- On token refresh, if `sessionId` is null and `activeSessionId` is set:
  - In restricted mode: reject with `SESSION_INVALIDATED` (forces re-login)
  - In allowed mode: allow (edge case, but safe)
- **Better approach:** Migration script that assigns `sessionId` to all active (non-revoked, non-expired) refresh tokens

```javascript
// One-time migration script
const { v4: uuidv4 } = require('uuid');
await RefreshToken.updateMany(
  { isRevoked: false, expiresAt: { $gt: new Date() }, sessionId: { $exists: false } },
  [
    { $set: { sessionId: { $toString: { $concat: ['$_id', '-', { $toString: '$$NOW' }] } } } }
  ]
);
```

### Existing JWTs
- JWTs already in circulation (before deployment) won't have `sessionId`
- Middleware handles missing `sessionId` gracefully (passes through)
- After migration deployment, any JWT issued before migration without `sessionId` will work until expiry
- No forced logout of existing tokens

### Deployment
- **Zero downtime** — all changes are additive
- Deploy backend first (new fields nullable, new middleware logic backward-compatible)
- Run migration script
- Deploy frontend (new UI components are additive)
- No user action required

### Rollback
- If issues arise, disable middleware `sessionId` check via feature flag
- Frontend can hide SessionExpired route
- Database changes are non-breaking

---

## PLAN PHASE 8: Regression Analysis

### Affected Modules

| Module | Risk | Impact | Mitigation |
|--------|------|--------|------------|
| **Student** | Medium | Login/logout/refresh flows change | Test all auth flows, verify dashboard loads |
| **Teacher** | Medium | Same as Student | Test attendance, timetable access after session invalidation |
| **HOD** | Medium | Same | Test approvals, reports |
| **College Admin** | Medium | GeneralSettings page changes | Test settings save/load, verify `allowMultipleLogins` persists |
| **Super Admin** | Low | No direct auth changes | No action needed |
| **Attendance** | Low | Protected by auth middleware | Verify protected routes still work after session enforcement |
| **Timetable** | Low | Protected by auth middleware | Same as Attendance |
| **Payments** | Low | Protected by auth middleware | Critical flow — test payment completion |
| **Finance** | Low | Protected by auth middleware | Test reports access |
| **Reports** | Low | Protected by auth middleware | Verify data loads |
| **Notifications** | Low | Protected by auth middleware | Test notification list/compose |
| **Security Audit** | Low | New session events to add | Extend audit logging for session invalidation events |

### Potential Regressions

1. **Infinite redirect loop**: `SESSION_INVALIDATED` → `/session-expired` → checks auth → `SESSION_INVALIDATED`
   - **Mitigation**: `/session-expired` is a public route, no auth check

2. **React crash from stale state**: Tab A's user state doesn't match cookie after Tab B login
   - **Mitigation**: BroadcastChannel syncs tabs, all tabs clear state on invalidation

3. **Refresh token loop**: Client auto-refreshes on 401, gets 401 again
   - **Mitigation**: `/auth/refresh` returns `SESSION_INVALIDATED`; interceptor stops retry loop

4. **Performance hit from extra DB query**: Middleware queries College for `allowMultipleLogins`
   - **Mitigation**: Cache setting per college (in-memory, 5-min TTL). Query is indexed by `college_id`.

5. **Migration script locks database**: Updating all RefreshTokens at once
   - **Mitigation**: Run in batches of 1000, during low-traffic window

6. **Logout doesn't clear activeSessionId for other sessions**: User logs out from one device, others remain
   - **Mitigation**: Logout clears only the matching session's `activeSessionId`. Other sessions remain in "allowed" mode. In "restricted" mode, there can only be one session, so this is correct.

---

## PLAN PHASE 9: Implementation Order

### Phase 1: Backend Persistence (Week 1)
- [ ] Add `activeSessionId` to User model
- [ ] Add `sessionId` to RefreshToken model
- [ ] Add `allowMultipleLogins` to College model
- [ ] Create Session model
- [ ] Generate and run migration script for existing tokens
- [ ] Add `GET/PUT /api/settings/general` endpoints
- [ ] Unit tests for models and migration

**Deliverable**: All schema changes in place, settings API functional

### Phase 2: Session Enforcement (Week 2)
- [ ] Update `sendTokens()` to generate `sessionId`, store in RefreshToken + Session
- [ ] Update `login()` to handle restricted/allowed modes
- [ ] Update `logout()` to clear `activeSessionId` and revoke session
- [ ] Update `refreshToken()` to validate `sessionId`
- [ ] Update `changePassword()` / `verifyOTPAndResetPassword()` to clear `activeSessionId`
- [ ] Update auth middleware with `SESSION_INVALIDATED` check
- [ ] Add security audit events: `SESSION_INVALIDATED`, `SINGLE_SESSION_TERMINATED`, `MULTI_LOGIN_DETECTED`

**Deliverable**: Backend fully enforces session policy

### Phase 3: Frontend UX (Week 3)
- [ ] Update axios interceptor for `SESSION_INVALIDATED` handling
- [ ] Update AuthContext with `sessionInvalidated` state and BroadcastChannel
- [ ] Create `SessionExpired.jsx` component and route
- [ ] Update ProtectedRoute to handle session expiration
- [ ] Wire `GeneralSetting.jsx` to real API
- [ ] Add session sync across tabs
- [ ] Update Login.jsx to show "previous session terminated" toast in restricted mode

**Deliverable**: Professional UX, no crashes, cross-tab sync working

### Phase 4: Testing (Week 4)
- [ ] Run full test matrix (see Phase 10)
- [ ] Manual QA on all roles
- [ ] Load test with concurrent logins
- [ ] Browser compatibility test (BroadcastChannel fallback)

**Deliverable**: Verified, production-ready implementation

### Phase 5: Deployment
- [ ] Deploy backend (blue-green or rolling)
- [ ] Run migration script
- [ ] Deploy frontend
- [ ] Monitor security audit logs for anomalies
- [ ] Verify `allowMultipleLogins` behavior in production

---

## PLAN PHASE 10: Testing Strategy

### Test Matrix

| # | Scenario | Expected Result | Test Type |
|---|----------|-----------------|-----------|
| 1 | Same user, two browsers (allowed) | Both sessions active | Integration |
| 2 | Same user, two browsers (restricted) | First session invalidated, second active | Integration |
| 3 | Same browser, different tabs (allowed) | Both tabs work independently | Integration |
| 4 | Same browser, different tabs (restricted) | Second login invalidates first tab | Integration |
| 5 | Different users, same browser | Independent sessions | Integration |
| 6 | Multiple roles (Student, Teacher, HOD, Admin) | All roles enforce policy correctly | E2E |
| 7 | Refresh token flow (allowed) | Token refreshes normally | Unit |
| 8 | Refresh token flow (restricted) | Rejected if session changed | Unit |
| 9 | Logout from one device | Only that session ends (allowed) | Integration |
| 10 | Logout from one device (restricted) | All sessions end | Integration |
| 11 | Password change | All sessions invalidated, `activeSessionId` cleared | Integration |
| 12 | Password reset | All sessions invalidated | Integration |
| 13 | Session expiry (access token) | 401 on protected route → redirect to login | E2E |
| 14 | Browser refresh (allowed) | Session persists via refresh token | E2E |
| 15 | Browser refresh (restricted) | Session persists if still active | E2E |
| 16 | Browser reopen after close | New session created (allowed), replaces old (restricted) | E2E |
| 17 | Network reconnect after offline | Token refresh attempts, validates session | Integration |
| 18 | Multi-tenant isolation | College A settings don't affect College B | Integration |
| 19 | Concurrent rapid logins (restricted) | Last login wins, previous sessions terminated | Load |
| 20 | Stale JWT after migration | Accepted until expiry, then requires re-login | E2E |

### Security Tests
- [ ] Attempt to use revoked refresh token → 401
- [ ] Attempt to use access token from invalidated session → 401 `SESSION_INVALIDATED`
- [ ] Attempt to modify JWT payload `sessionId` → signature fails
- [ ] Verify `activeSessionId` is cleared on password change
- [ ] Verify `allowMultipleLogins` change takes effect on next login only
- [ ] Verify College Admin cannot modify other college's settings
- [ ] Verify Super Admin can view all settings but changes are college-scoped

### Frontend Tests
- [ ] `SessionExpired` renders correctly with reason
- [ ] BroadcastChannel notifies all tabs within 100ms
- [ ] localStorage fallback works when BroadcastChannel unavailable
- [ ] AuthContext doesn't crash on null user during session expiration
- [ ] ProtectedRoute redirects to `/session-expired` not `/login`
- [ ] Login shows "previous session terminated" toast in restricted mode
- [ ] GeneralSetting page loads/saves without errors

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Middleware performance degradation | Low | Medium | Cache `allowMultipleLogins` per college |
| Migration locks DB | Medium | High | Batch migration, off-peak window |
| Cross-tab sync fails silently | Low | Medium | Fallback to localStorage, log warnings |
| Users trapped in redirect loop | Low | High | Public route for SessionExpired, guard flags |
| Existing sessions break unexpectedly | Medium | Medium | Default `activeSessionId = null`, gradual rollout |
| Settings not persisting | Low | Low | API tests + frontend validation |

---

## Open Questions

1. **Should `activeSessionId` be cleared on College Admin changing `allowMultipleLogins`?**
   - **Recommendation**: No — change applies to future logins only. Existing sessions continue.

2. **Should Super Admin be exempt from single-session restriction?**
   - **Recommendation**: Yes — Super Admin manages the platform and may need concurrent access. Apply restriction only to college-scoped roles.

3. **Should we blacklist previous access tokens on restricted-mode login?**
   - **Recommendation**: Yes — immediately invalidates old tokens rather than waiting for them to expire. Reduces attack window.

4. **Session idle timeout?**
   - **Recommendation**: Out of scope for LOGIN-09. Address in future ticket with `lastActivityAt` + idle timeout.

---

## Deliverables Checklist

1. ✅ Proposed Architecture: Hybrid Session Collection + activeSessionId
2. ✅ Recommended Design Decision: Option A with Session collection supplement
3. ✅ Database Changes: 3 model modifications, 1 new model, indexes, migration
4. ✅ Backend Plan: Controller, middleware, models, settings API, security audit
5. ✅ Frontend Plan: Axios interceptor, AuthContext, ProtectedRoute, SessionExpired, GeneralSetting, BroadcastChannel
6. ✅ Authentication Flow Diagram: Login → Token creation → Validation → Refresh → Logout → Second login
7. ✅ Session Lifecycle Diagram: Create → Active → Invalidated → Expired → Revoked
8. ✅ Configuration Flow: Database → API → Frontend → Backend → Middleware
9. ✅ Migration Strategy: Zero-downtime, backward-compatible, no forced logout
10. ✅ Regression Analysis: All 12 modules assessed with mitigations
11. ✅ Risk Assessment: 6 risks with likelihood, impact, mitigation
12. ✅ Phase-wise Implementation Plan: 5 phases, independently testable
13. ✅ Comprehensive Testing Plan: 20-scenario matrix + security + frontend tests
