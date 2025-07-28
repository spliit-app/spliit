# Data Models

## Core Spliit Models (Enhanced for Conversational Features)

### Expense Model
**Purpose:** Represents a shared expense with AI-enhanced creation capabilities

**Key Attributes:**
- `id`: string - Unique identifier
- `title`: string - Expense description (AI-parsed from natural language)
- `amount`: number - Amount in cents (AI-extracted from various formats)
- `groupId`: string - Associated group
- `paidById`: string - Participant who paid
- `paidFor`: ExpensePaidFor[] - Participants and their shares
- `category`: Category - AI-suggested category
- `expenseDate`: Date - AI-parsed date or default
- `conversationContextId`: string? - Optional link to conversation that created this expense

**TypeScript Interface:**
```typescript
interface Expense {
  id: string;
  title: string;
  amount: number; // In cents
  groupId: string;
  paidById: string;
  paidFor: ExpensePaidFor[];
  category: Category;
  expenseDate: Date;
  splitMode: 'EVENLY' | 'BY_SHARES' | 'BY_PERCENTAGE' | 'BY_AMOUNT';
  isReimbursement: boolean;
  notes?: string;
  documents: ExpenseDocument[];
  conversationContextId?: string; // New: Link to conversation
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- Many-to-One with Group
- Many-to-One with Participant (paidBy)
- One-to-Many with ExpensePaidFor
- Optional One-to-One with ConversationContext

### ConversationContext Model
**Purpose:** Manages persistent conversation state across sessions and devices

**Key Attributes:**
- `id`: string - Unique identifier
- `userId`: string - User owning the conversation
- `groupId`: string? - Optional group context
- `sessionId`: string - Browser session identifier
- `deviceFingerprint`: string - For cross-device continuity
- `conversationState`: ConversationState - Current AI state
- `expiresAt`: Date - Automatic cleanup timestamp

**TypeScript Interface:**
```typescript
interface ConversationContext {
  id: string;
  userId: string;
  groupId?: string;
  sessionId: string;
  deviceFingerprint: string;
  conversationState: {
    currentIntent: string;
    parsedEntities: Record<string, any>;
    confirmationPending: boolean;
    conversationHistory: ConversationTurn[];
    contextVariables: Record<string, any>;
  };
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationTurn {
  id: string;
  conversationContextId: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  metadata: {
    intentConfidence?: number;
    entitiesExtracted?: Record<string, any>;
    fallbackUsed?: boolean;
    aiModel?: string;
  };
  timestamp: Date;
}
```

**Relationships:**
- Many-to-One with User
- Optional Many-to-One with Group
- One-to-Many with ConversationTurn
- One-to-Many with Expense (expenses created from this conversation)

### Enhanced User Model
**Purpose:** User profile with conversational preferences

**TypeScript Interface:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  preferences: {
    defaultCurrency: string;
    conversationalMode: boolean;
    voiceInputEnabled: boolean;
    confirmationLevel: 'low' | 'medium' | 'high';
    preferredLanguage: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```
