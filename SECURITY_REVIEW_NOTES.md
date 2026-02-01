# Security Review Notes for Anonymous User Authentication

This document outlines remaining security concerns identified in the code review and potential approaches to address them.

## Critical Security Issues Requiring Architectural Changes

### 1. Authorization Missing on Anonymous User Endpoints

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

**Root Cause:** The system relies on client-side UUID as the sole security identifier, which is:
- Generated client-side (predictable)
- Stored in localStorage (accessible to any script)
- Not validated server-side for ownership

### 2. WebAuthn Challenge Storage (Client-Side)

**Issue:** WebAuthn challenges are generated server-side but passed back to the client and then returned with the response. This allows potential replay attacks.

**Affected Endpoints:**
- `/api/anonymous-users/passkey/register-verify`
- `/api/anonymous-users/passkey/auth-verify`

**Current Risk:** An attacker could:
- Generate their own challenge
- Replay authentication responses
- Bypass challenge validation

## Potential Solutions

### Option 1: Session-Based Authentication (Recommended for Security)

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

## Recommendations

1. **Immediate (Low Effort):**
   - Add rate limiting documentation (✅ Done)
   - Improve error messages (✅ Done)
   - Add input validation (✅ Done)

2. **Short Term (Medium Effort):**
   - Implement server-side challenge storage
   - Add HMAC-based UUID validation (Option 3)
   - Consider adding challenge store with Redis

3. **Long Term (High Effort):**
   - Implement proper session-based authentication (Option 1)
   - Add audit logging for security events
   - Consider adding 2FA for passphrase-based auth

## Trade-offs

The current implementation prioritizes:
- ✅ Simplicity (no backend dependencies)
- ✅ Statelessness (easy to scale)
- ✅ User experience (no signup friction)

At the cost of:
- ❌ Security (UUID-based access)
- ❌ Accountability (no true authentication)
- ❌ Protection against malicious actors

For a production system handling sensitive data, **Option 1 (Session-Based Authentication)** is recommended. For a lightweight system where the risk of account takeover is acceptable, the current approach with **Option 3 (Enhanced UUID Security)** may be sufficient.
