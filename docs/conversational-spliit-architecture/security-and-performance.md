# Security and Performance

## Security Requirements

**Frontend Security:**
- **CSP Headers**: `default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; connect-src 'self' https://*.supabase.co https://api.openai.com`
- **XSS Prevention**: Input sanitization for all user content, especially conversation messages
- **Secure Storage**: JWT tokens in httpOnly cookies, conversation state in encrypted localStorage

**Backend Security:**
- **Input Validation**: Zod schemas for all API inputs, special validation for AI-generated content
- **Rate Limiting**: 60 requests/minute per user, 10 AI requests/minute per user
- **CORS Policy**: Restricted to domain whitelist, dynamic origin validation

**Authentication Security:**
- **Token Storage**: JWT in httpOnly cookies, refresh token rotation
- **Session Management**: 24-hour conversation context expiry, automatic cleanup
- **Password Policy**: Google OAuth only - no password storage

## Performance Optimization

**Frontend Performance:**
- **Bundle Size Target**: < 500KB initial bundle, < 100KB route chunks
- **Loading Strategy**: Lazy loading for AI components, conversation history pagination
- **Caching Strategy**: React Query 5-minute cache, aggressive prefetching for groups

**Backend Performance:**
- **Response Time Target**: < 200ms API responses, < 3s AI processing
- **Database Optimization**: Indexed queries, connection pooling, read replicas for conversation history
- **Caching Strategy**: Supabase Edge Cache, conversation context caching
