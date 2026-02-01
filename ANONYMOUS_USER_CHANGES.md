# Anonymous User Feature - Data Hygiene and Rate Limiting

## Overview
This document describes the changes made to prevent database bloat from unused anonymous accounts and to protect against abuse through rate limiting.

## Changes Made

### 1. Rate Limiting Implementation

Created a new rate limiter utility at `/src/lib/rate-limit.ts`:
- **In-memory rate limiting**: Simple Map-based storage for tracking requests
- **Configuration**: 10 requests per minute per IP address
- **Identifier**: Uses IP address from `x-forwarded-for` or `x-real-ip` headers
- **Auto-cleanup**: Periodically removes expired entries (1% chance on each request)

### 2. Account Persistence Logic

Modified anonymous user creation and group association logic to only persist accounts when they have meaningful data:

#### `/src/app/api/anonymous-users/ensure/route.ts`
- **Before**: Always created/updated user records unconditionally
- **After**: 
  - Only updates existing users
  - New users are NOT persisted until they associate with a group or set up authentication
  - Adds rate limiting

#### `/src/app/api/anonymous-users/groups/route.ts`
- **Before**: Always created user and associated groups
- **After**:
  - When groups array is empty:
    - Deletes user if they have no passphrase or passkey configured
    - Only removes groups if user has authentication configured
  - When groups array has items:
    - Creates user if they don't exist (now they have groups)
    - Updates group associations
  - Adds rate limiting to both GET and POST endpoints

### 3. Rate Limiting Applied to All Endpoints

Added rate limiting to all anonymous user API endpoints:

- ✅ `/api/anonymous-users/ensure` - User creation/update
- ✅ `/api/anonymous-users/groups` - Group associations (GET and POST)
- ✅ `/api/anonymous-users/passphrase` - Passphrase setup/update
- ✅ `/api/anonymous-users/recover` - Account recovery
- ✅ `/api/anonymous-users/delete` - Account deletion
- ✅ `/api/anonymous-users/passkey/register-options` - Passkey registration options
- ✅ `/api/anonymous-users/passkey/register-verify` - Passkey registration verification
- ✅ `/api/anonymous-users/passkey/auth-options` - Passkey authentication options
- ✅ `/api/anonymous-users/passkey/auth-verify` - Passkey authentication verification
- ✅ `/api/anonymous-users/passkey/delete` - Passkey removal

## User Flow Impact

### New Anonymous User Flow
1. User visits site → UUID generated in localStorage
2. User browses without creating account → **No database record created**
3. User associates with a group → Database record created
4. User removes all groups:
   - If they have passphrase/passkey → Account retained, groups removed
   - If no authentication → **Account deleted automatically**

### Existing User Flow
- No changes to existing users
- They continue to work as before

## Benefits

1. **Database Hygiene**: Only store accounts that have:
   - Group associations, OR
   - Authentication configured (passphrase or passkey)

2. **Abuse Prevention**: Rate limiting prevents:
   - Spam account creation
   - Brute force attacks on passphrase recovery
   - DoS attacks on passkey endpoints

3. **Performance**: Automatic cleanup reduces database bloat

## Rate Limit Configuration

Current settings in `/src/lib/rate-limit.ts`:
```typescript
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute
```

These can be adjusted based on usage patterns.

## Testing Recommendations

1. **Test anonymous user lifecycle**:
   - Create new anonymous user (no DB record)
   - Associate with group (DB record created)
   - Remove all groups without auth (DB record deleted)
   - Remove all groups with auth (groups removed, user retained)

2. **Test rate limiting**:
   - Make 11 rapid requests from same IP
   - Verify 11th request returns 429 status
   - Wait 1 minute and verify requests work again

3. **Test authentication flows**:
   - Passphrase creation triggers user persistence
   - Passkey registration triggers user persistence
   - Both maintain user even when groups are removed

## Future Improvements

Consider these enhancements if needed:

1. **Persistent rate limiting**: Use Redis or similar for multi-instance deployments
2. **Configurable limits**: Environment variables for rate limit thresholds
3. **User-specific limits**: Different limits for authenticated vs anonymous users
4. **Scheduled cleanup**: Background job to remove stale anonymous users periodically
5. **Metrics**: Track rate limit hits and anonymous user lifecycle events
