# Security Review Notes for Anonymous User Authentication

## ✅ IMPLEMENTED: Session-Based Authentication (Option 1)

**Implementation Date:** February 1, 2026

### Status: RESOLVED

The critical security issues identified in this document have been addressed through the implementation of server-side session-based authentication.

### What Was Implemented

1. **Session Management System** ([/src/lib/session.ts](src/lib/session.ts))
   - Cryptographically secure session tokens (32-byte random)
   - Server-side session storage with automatic cleanup
   - Session expiration (7 days default)
   - HttpOnly, Secure, SameSite=Strict cookies
   - Helper functions for session validation and management

2. **Protected Endpoints with Authorization**
   - [/api/anonymous-users/delete](src/app/api/anonymous-users/delete/route.ts) - ✅ Requires session, verifies ownership
   - [/api/anonymous-users/passphrase](src/app/api/anonymous-users/passphrase/route.ts) - ✅ Requires session for updates, creates session
   - [/api/anonymous-users/groups](src/app/api/anonymous-users/groups/route.ts) - ✅ Requires session, verifies ownership
   - [/api/anonymous-users/passkey/delete](src/app/api/anonymous-users/passkey/delete/route.ts) - ✅ Requires session, verifies ownership
   - [/api/anonymous-users/passkey/register-verify](src/app/api/anonymous-users/passkey/register-verify/route.ts) - ✅ Creates session after registration

3. **Server-Side WebAuthn Challenge Storage**
   - Challenges stored in server-side sessions (5-minute TTL)
   - Challenges deleted after use (prevents replay attacks)
   - Client never receives the challenge
   - [/api/anonymous-users/passkey/register-options](src/app/api/anonymous-users/passkey/register-options/route.ts) - ✅ Stores challenge server-side
   - [/api/anonymous-users/passkey/auth-options](src/app/api/anonymous-users/passkey/auth-options/route.ts) - ✅ Stores challenge server-side
   - [/api/anonymous-users/passkey/register-verify](src/app/api/anonymous-users/passkey/register-verify/route.ts) - ✅ Validates server-side challenge
   - [/api/anonymous-users/passkey/auth-verify](src/app/api/anonymous-users/passkey/auth-verify/route.ts) - ✅ Validates server-side challenge

4. **Session Creation on Authentication**
   - [Passphrase authentication](src/app/api/anonymous-users/passphrase/route.ts) - Creates session
   - [Passkey authentication](src/app/api/anonymous-users/passkey/auth-verify/route.ts) - Creates session
   - [Account recovery](src/app/api/anonymous-users/recover/route.ts) - Creates session

### Security Improvements

✅ **Authorization Fixed:** Users can now only modify their own accounts
- Endpoints verify session ownership before allowing operations
- Session token tied to specific userId
- 403 Forbidden returned for unauthorized access attempts

✅ **WebAuthn Replay Attacks Prevented:** Challenges stored server-side
- Challenge never sent to client
- Challenge deleted after single use
- 5-minute TTL on challenges
- 401 Unauthorized for expired/missing challenges

✅ **Session Security:** Proper cookie configuration
- HttpOnly prevents XSS access
- Secure flag in production (HTTPS only)
- SameSite=Strict prevents CSRF
- 7-day expiration with automatic cleanup

### Implementation Notes

**In-Memory Session Storage:**
The current implementation uses an in-memory Map for session storage. This is suitable for:
- Development and testing
- Single-instance deployments
- Low-to-medium traffic applications

**For Production at Scale:**
Consider migrating to Redis or database-backed session storage:
- Survives server restarts
- Works with multiple instances/load balancers
- Better performance for high traffic
- Centralized session management

**Migration Path:**
The `SessionStore` class can be easily replaced with a Redis implementation:
```typescript
// Example Redis adapter
class RedisSessionStore extends SessionStore {
  async create(userId: string, expiresInMs: number) {
    const token = this.generateToken()
    await redis.setex(`session:${token}`, expiresInMs / 1000, JSON.stringify({...}))
    return token
  }
  // ... other methods
}
```

---

# Original Security Review Notes (Historical)

This document outlines remaining security concerns identified in the code review and potential approaches to address them.

## Critical Security Issues Requiring Architectural Changes

### 1. Authorization Missing on Anonymous User Endpoints ✅ RESOLVED

**Issue:** Multiple endpoints allow any user to modify any account by simply knowing the userId (UUID):
- `/api/anonymous-users/delete` - Delete any account
- `/api/anonymous-users/passphrase` - Change any account's passphrase
- `/api/anonymous-users/groups` - Modify any account's group associations
- `/api/anonymous-users/passkey/delete` - Remove any account's passkey
- `/api/anonymous-users/passkey/register-verify` - Register passkey for any account

**Current Risk:** An attacker who discovers or guesses a user's UUID could:
- Delete their account permanently
- Change their passphrase and lock them out
- Remove their passkey authentication
- Modify their group associations

**Resolution:** Implemented session-based authentication. All protected endpoints now:
- Require valid session cookie
- Verify session.userId matches the requested userId
- Return 401 for missing/invalid sessions
- Return 403 for ownership mismatches

**Root Cause:** The system relies on client-side UUID as the sole security identifier, which is:
- Generated client-side (predictable)
- Stored in localStorage (accessible to any script)
- Not validated server-side for ownership

**Resolution:** Server-side sessions replace client-side UUID as security identifier. Sessions are:
- Generated server-side with crypto.randomBytes (unpredictable)
- Stored in HttpOnly cookies (not accessible to JavaScript)
- Validated server-side for every protected operation

### 2. WebAuthn Challenge Storage (Client-Side) ✅ RESOLVED

**Issue:** WebAuthn challenges are generated server-side but passed back to the client and then returned with the response. This allows potential replay attacks.

**Affected Endpoints:**
- `/api/anonymous-users/passkey/register-verify`
- `/api/anonymous-users/passkey/auth-verify`

**Current Risk:** An attacker could:
- Generate their own challenge
- Replay authentication responses
- Bypass challenge validation

**Resolution:** Challenges now stored exclusively server-side in sessions:
- `register-options` and `auth-options` store challenge in session
- Challenge excluded from response sent to client
- `register-verify` and `auth-verify` retrieve challenge from session
- Challenge deleted after use (one-time use)
- 5-minute TTL on challenges with automatic expiration

## Potential Solutions (Historical Reference)

### Option 1: Session-Based Authentication (✅ IMPLEMENTED)

Convert the anonymous system to use server-side sessions:

```typescript
// Server-side session storage (Redis or encrypted cookies)
interface AnonymousSession {
  userId: string
  createdAt: Date
  expiresAt: Date
  verified: boolean
}

// Session middleware
async function getAnonymousSession(request: Request): Promise<AnonymousSession | null> {
  const sessionToken = request.cookies.get('anon_session')
  if (!sessionToken) return null
  return await sessionStore.get(sessionToken)
}
```

**Pros:**
- Proper security model
- Server-side session validation
- Can store WebAuthn challenges in session
- Prevents unauthorized access

**Cons:**
- Requires session storage (Redis/database)
- More complex architecture
- Requires HTTPS for secure cookies

### Option 2: Signed Tokens (JWT/JWE)

Use cryptographically signed tokens for authorization:

```typescript
// Generate signed token on authentication
const token = await signToken({
  userId: user.id,
  exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
})

// Verify on protected endpoints
async function verifyAnonymousAuth(request: Request): Promise<string | null> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const payload = await verifyToken(token)
  return payload.userId
}
```

**Pros:**
- Stateless (no session storage needed)
- Works with multi-instance deployments
- Can include WebAuthn challenges in token

**Cons:**
- Requires secret key management
- Cannot invalidate tokens (until expiry)
- Still vulnerable if token is stolen

### Option 3: Enhanced UUID Security (Minimal Change)

Keep current architecture but add validation layers:

```typescript
// Add HMAC-based validation
async function generateSecureUserId(): Promise<{ id: string; secret: string }> {
  const SECRET_KEY = process.env.SECRET_KEY
  if (!SECRET_KEY) {
    throw new Error('SECRET_KEY environment variable is not configured')
  }
  const id = crypto.randomUUID()
  const secret = await generateHMAC(id, SECRET_KEY)
  return { id, secret }
}

// Validate on endpoints
async function validateUserAccess(userId: string, secret: string): Promise<boolean> {
  const SECRET_KEY = process.env.SECRET_KEY
  if (!SECRET_KEY) {
    throw new Error('SECRET_KEY environment variable is not configured')
  }
  const expectedSecret = await generateHMAC(userId, SECRET_KEY)
  return constant_time_compare(secret, expectedSecret)
}
```

**Pros:**
- Minimal code changes
- No session storage required
- Better than current UUID-only approach

**Cons:**
- Still relies on client storage
- Not true authentication
- Vulnerable to XSS attacks

## WebAuthn Challenge Storage Solutions

### Server-Side Challenge Storage

```typescript
// Challenge store (Redis or in-memory with TTL)
interface ChallengeStore {
  set(userId: string, challenge: string, ttl: number): Promise<void>
  get(userId: string): Promise<string | null>
  delete(userId: string): Promise<void>
}

// Registration flow
export async function POST(request: Request) {
  const options = await generateRegistrationOptions(...)
  await challengeStore.set(userId, options.challenge, 300) // 5 min TTL
  return NextResponse.json({ ...options, challenge: undefined }) // Don't send to client
}

// Verification flow
export async function POST(request: Request) {
  const expectedChallenge = await challengeStore.get(userId)
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge expired' }, { status: 401 })
  }
  
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    ...
  })
  
  await challengeStore.delete(userId) // Prevent replay
  ...
}
```

## Recommendations ✅ COMPLETED

1. **Immediate (Low Effort):**
   - ✅ Add rate limiting documentation (Done)
   - ✅ Improve error messages (Done)
   - ✅ Add input validation (Done)

2. **Short Term (Medium Effort):**
   - ✅ Implement server-side challenge storage (COMPLETED Feb 2026)
   - ✅ Add session-based authentication (COMPLETED Feb 2026)
   - ⏸️ Consider adding challenge store with Redis (Optional - can use in-memory for now)

3. **Long Term (High Effort):**
   - ✅ Implement proper session-based authentication (COMPLETED Feb 2026)
   - ⏸️ Add audit logging for security events (Future enhancement)
   - ⏸️ Consider adding 2FA for passphrase-based auth (Future enhancement)

## Current Security Status

The system now has:
- ✅ Session-based authentication with secure cookies
- ✅ Server-side authorization on all protected endpoints
- ✅ Server-side WebAuthn challenge storage
- ✅ Protection against unauthorized account modifications
- ✅ Protection against WebAuthn replay attacks
- ✅ Rate limiting on all endpoints
- ✅ Input validation

Remaining considerations:
- 📝 For production scale: migrate to Redis/database session storage
- 📝 Consider audit logging for security-sensitive operations
- 📝 Monitor session store size and cleanup effectiveness

## Trade-offs (Updated)

The implementation now provides:
- ✅ Security (session-based authentication)
- ✅ Accountability (server-side session validation)
- ✅ Protection against malicious actors
- ✅ Simplicity (in-memory sessions, no external dependencies yet)
- ✅ Stateful authentication (sessions with cleanup)
- ✅ User experience (automatic session management via cookies)

Next steps for production scale:
- Consider Redis/database for session persistence
- Add monitoring for session metrics
- Implement audit logging for security events
