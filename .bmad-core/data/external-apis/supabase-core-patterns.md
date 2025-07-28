# Supabase Core Patterns for Spliit Conversational AI

## Authentication Context

### User Authentication
```typescript
import { createClient } from '@supabase/supabase-js'
import { env } from '~/lib/env'

// Client-side auth for conversational interface
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

// Check auth status before AI interactions
const { data: { user } } = await supabase.auth.getUser()
```

### Auth Integration with Conversational AI
- All conversational commands require authenticated user context
- User ID needed for expense participant matching
- Group membership validation for conversational group operations

## Database Schema Patterns

### Core Tables for Conversational AI
```sql
-- Users (for participant matching in conversations)
users (id, email, name, created_at)

-- Groups (for "create Vegas trip group" commands)  
groups (id, name, description, created_by, currency, created_at)

-- Participants (for participant context)
participants (id, name, group_id, user_id, created_at)

-- Expenses (primary target for conversational creation)
expenses (id, group_id, title, amount, paid_by_id, category_id, expense_date, created_at)

-- Expense Paid For (for "split with John and Jane")
expense_paid_for (id, expense_id, participant_id, shares)
```

### Query Patterns for AI Integration

#### Participant Resolution for Conversational Input
```typescript
// Resolve "John" to actual user in current group context
const resolveParticipant = async (name: string, groupId: string) => {
  const { data } = await supabase
    .from('participants')
    .select('user_id, users(name, email)')
    .eq('group_id', groupId)
    .ilike('users.name', `%${name}%`)
}
```

#### Balance Queries for "How much does John owe me?"
```typescript
const getBalanceBetweenUsers = async (userId1: string, userId2: string, groupId: string) => {
  // Use existing balance calculation logic through tRPC
  // AI interprets intent, tRPC handles complex balance computation
}
```

## Real-time Patterns for Conversational Interface

### Live Conversation Updates
```typescript
// Subscribe to expense changes during conversation
const expenseSubscription = supabase
  .channel('expenses')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'expenses' },
    (payload) => {
      // Update conversational interface with real-time changes
      updateConversationContext(payload)
    }
  )
  .subscribe()
```

### Collaborative Group Management
```typescript
// Real-time group member changes for conversational context
const groupSubscription = supabase
  .channel(`group:${groupId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'participants' },
    (payload) => {
      // Update participant suggestions in AI interface
      refreshParticipantContext(payload)
    }
  )
  .subscribe()
```

## Integration with tRPC Endpoints

### Conversational AI → tRPC Flow
1. **AI Intent Parsing**: Extract structured data from natural language
2. **Supabase Context**: Resolve participants, validate permissions
3. **tRPC Execution**: Use existing endpoints for data operations
4. **Real-time Updates**: Supabase subscriptions for immediate feedback

### Key tRPC Endpoints for AI Integration
- `expenses.create` - Execute AI-suggested expense creation
- `expenses.list` - Fulfill conversational history queries  
- `groups.create` - Handle conversational group creation
- `balances.list` - Resolve balance inquiries

## Error Handling for AI Context

### Common Conversational Scenarios
```typescript
// Ambiguous participant names
if (matchingUsers.length > 1) {
  return {
    type: 'clarification_needed',
    message: 'I found multiple Johns. Did you mean John Smith or John Doe?',
    options: matchingUsers
  }
}

// Invalid group context
if (!userHasGroupAccess) {
  return {
    type: 'permission_error', 
    message: 'You don\'t have access to that group'
  }
}
```

## Performance Considerations

### Optimized Queries for Conversational Context
- Cache group member lists for participant resolution
- Use RLS policies for automatic permission filtering
- Index on name columns for fuzzy participant matching
- Batch operations for complex conversational commands

### Real-time Subscription Management
- Subscribe only to relevant group/expense channels
- Unsubscribe when leaving conversational context
- Throttle updates to avoid overwhelming AI interface