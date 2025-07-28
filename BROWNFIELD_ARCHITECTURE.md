# Spliit Brownfield Architecture Document

## Executive Summary

Spliit is a mature, production-ready expense sharing application built as a free and open-source alternative to Splitwise. The application enables users to create groups, manage shared expenses, track balances, and settle debts with sophisticated splitting algorithms and receipt scanning capabilities.

**Current Status**: Fully functional Next.js application with existing AI integration (receipt scanning, category extraction)
**Goal**: Add conversational AI layer for natural language interaction while maintaining existing UI as fallback

---

## Technology Stack

### Core Framework
- **Frontend**: Next.js 14.2.5 (App Router)
- **Styling**: TailwindCSS + shadcn/UI components
- **Database**: PostgreSQL with Prisma ORM (v5.6.0)
- **API Layer**: tRPC v11 (type-safe API)
- **Hosting**: Vercel (with Vercel Postgres)
- **Containerization**: Docker + Docker Compose

### Dependencies & Libraries
```json
{
  "react": "^18.3.1",
  "next": "^14.2.5",
  "@trpc/server": "^11.0.0-rc.586",
  "@prisma/client": "^5.6.0",
  "react-hook-form": "^7.47.0",
  "zod": "^3.22.4",
  "openai": "^4.25.0",
  "next-s3-upload": "^0.3.4",
  "next-intl": "^3.17.2"
}
```

### Optional Integrations
- **AWS S3**: Document storage (receipts, images)
- **OpenAI**: Receipt scanning & category extraction
- **PWA**: Progressive Web App capabilities

---

## Database Schema & Models

### Core Entities

#### Group Model
```prisma
model Group {
  id           String        @id
  name         String
  information  String?       @db.Text
  currency     String        @default("$")
  participants Participant[]
  expenses     Expense[]
  activities   Activity[]
  createdAt    DateTime      @default(now())
}
```

#### Participant Model
```prisma
model Participant {
  id              String           @id
  name            String
  group           Group            @relation(fields: [groupId], references: [id], onDelete: Cascade)
  groupId         String
  expensesPaidBy  Expense[]
  expensesPaidFor ExpensePaidFor[]
}
```

#### Expense Model
```prisma
model Expense {
  id              String            @id
  group           Group             @relation(fields: [groupId], references: [id], onDelete: Cascade)
  expenseDate     DateTime          @default(dbgenerated("CURRENT_DATE")) @db.Date
  title           String
  category        Category?         @relation(fields: [categoryId], references: [id])
  categoryId      Int               @default(0)
  amount          Int               // Stored in cents (multiply by 100)
  paidBy          Participant       @relation(fields: [paidById], references: [id], onDelete: Cascade)
  paidById        String
  paidFor         ExpensePaidFor[]
  groupId         String
  isReimbursement Boolean           @default(false)
  splitMode       SplitMode         @default(EVENLY)
  createdAt       DateTime          @default(now())
  documents       ExpenseDocument[]
  notes           String?
  recurrenceRule  RecurrenceRule?   @default(NONE)
  recurringExpenseLink RecurringExpenseLink?
}
```

#### Split Modes
```prisma
enum SplitMode {
  EVENLY        // Equal split among all participants
  BY_SHARES     // Custom shares per participant
  BY_PERCENTAGE // Percentage-based split (out of 10000)
  BY_AMOUNT     // Specific amounts per participant
}
```

### Key Constraints
- **Currency amounts**: Stored as integers in cents (multiply user input by 100)
- **Percentages**: Stored out of 10000 (50% = 5000)
- **Cascade deletes**: Groups cascade to participants and expenses
- **Required relationships**: Every expense must have paidBy and paidFor participants

---

## API Structure (tRPC)

### Router Organization
```typescript
// Main router: src/trpc/routers/_app.ts
appRouter = {
  groups: groupsRouter,
  categories: categoriesRouter
}

// Groups router: src/trpc/routers/groups/index.ts
groupsRouter = {
  expenses: groupExpensesRouter,
  balances: groupBalancesRouter,
  stats: groupStatsRouter,
  activities: activitiesRouter,
  get: getGroupProcedure,
  getDetails: getGroupDetailsProcedure,
  list: listGroupsProcedure,
  create: createGroupProcedure,
  update: updateGroupProcedure
}
```

### Key API Endpoints

#### Groups
- `groups.create` - Create new group with participants
- `groups.get` - Fetch group with participants
- `groups.update` - Update group information
- `groups.list` - List user's groups

#### Expenses
- `groups.expenses.create` - Create new expense
- `groups.expenses.get` - Fetch single expense details
- `groups.expenses.update` - Update existing expense
- `groups.expenses.delete` - Delete expense
- `groups.expenses.list` - List group expenses with search

#### Balances & Stats
- `groups.balances.list` - Calculate participant balances and reimbursements
- `groups.stats.get` - Group spending statistics
- `groups.activities.list` - Activity log for group

#### Categories
- `categories.list` - Available expense categories

---

## Business Logic & Calculations

### Balance Calculation Algorithm
Located in `src/lib/balances.ts`:

```typescript
// Core balance calculation
export function getBalances(expenses): Balances {
  // 1. Initialize balances object for each participant
  // 2. For each expense:
  //    - Add amount to paidBy participant's "paid"
  //    - Calculate shares based on splitMode
  //    - Add calculated amounts to each participant's "paidFor"
  // 3. Calculate total = paid - paidFor for each participant
  // 4. Round to avoid floating point issues
}
```

### Split Mode Calculations
Located in `src/lib/totals.ts`:

```typescript
export function calculateShare(participantId, expense): number {
  switch (expense.splitMode) {
    case 'EVENLY':
      return expense.amount / paidFors.length
    case 'BY_AMOUNT':
      return shares // Direct amount
    case 'BY_PERCENTAGE':
      return (expense.amount * shares) / 10000
    case 'BY_SHARES':
      return (expense.amount * shares) / totalShares
  }
}
```

### Reimbursement Suggestions
Smart algorithm to minimize number of transactions:
```typescript
export function getSuggestedReimbursements(balances): Reimbursement[] {
  // 1. Sort participants by balance (creditors vs debtors)
  // 2. Match highest creditor with highest debtor
  // 3. Create reimbursement for minimum of the two amounts
  // 4. Repeat until all balances are settled
}
```

---

## User Interface Architecture

### Page Structure
```
src/app/
├── groups/
│   ├── page.tsx                    # Groups list
│   ├── create/                     # Create group
│   └── [groupId]/
│       ├── page.tsx               # Group dashboard
│       ├── expenses/              # Expense management
│       │   ├── page.tsx          # Expense list
│       │   ├── create/           # Create expense
│       │   └── [expenseId]/edit/ # Edit expense
│       ├── balances/             # Balance overview
│       ├── stats/                # Group statistics
│       ├── activity/             # Activity log
│       └── information/          # Group settings
```

### Component Architecture
```
src/components/
├── ui/                    # shadcn/UI base components
├── expense-form.tsx       # Complex form with splitting logic
├── group-form.tsx         # Group creation/editing
├── category-selector.tsx  # Category selection
└── money.tsx              # Currency formatting
```

### Key UI Patterns

#### Active User System
- LocalStorage-based user identification per group
- Modal prompt when user identity needed
- Automatic selection for expense creation

#### Form Validation
- Zod schemas with custom validation rules
- Real-time validation feedback
- Complex splitting validation logic

#### Responsive Design
- Mobile-first approach
- Progressive Web App capabilities
- Touch-friendly interfaces

---

## Existing AI Integration

### Receipt Scanning (OpenAI GPT-4 Turbo)
Located in `src/app/groups/[groupId]/expenses/create-from-receipt-button-actions.ts`:

```typescript
export async function extractExpenseInformationFromImage(imageUrl: string) {
  // 1. Upload image to S3
  // 2. Send to OpenAI vision API
  // 3. Extract: amount, category, date, title
  // 4. Return structured data for form population
}
```

### Category Extraction (OpenAI GPT-3.5 Turbo)
Located in `src/components/expense-form-actions.tsx`:

```typescript
export async function extractCategoryFromTitle(description: string) {
  // 1. Send expense title to OpenAI
  // 2. Match against available categories
  // 3. Return most relevant category ID
  // 4. Fallback to "General" category
}
```

### Feature Flags
Environment-controlled AI features:
```typescript
{
  NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT: boolean,
  NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT: boolean,
  OPENAI_API_KEY: string (required for AI features)
}
```

---

## Internationalization (i18n)

### Supported Languages
- English (en-US) - Default
- German (de-DE)
- Spanish (es)
- Finnish (fi)
- French (fr-FR)
- Italian (it-IT)
- Dutch (nl-NL)
- Polish (pl-PL)
- Portuguese Brazilian (pt-BR)
- Romanian (ro)
- Russian (ru-RU)
- Turkish (tr-TR)
- Ukrainian (ua-UA)
- Chinese Simplified (zh-CN)
- Chinese Traditional (zh-TW)

### Implementation
- `next-intl` for message management
- JSON files in `messages/` directory
- Server-side and client-side translation support

---

## User Flows & Features

### Core User Journeys

#### 1. Group Creation Flow
1. `/groups/create` - Group form (name, currency, participants)
2. Redirect to `/groups/{groupId}` - Group dashboard
3. Recent groups stored in localStorage for quick access

#### 2. Expense Creation Flow
1. `/groups/{groupId}/expenses/create` - Expense form
2. Form sections:
   - Basic info (title, amount, date, category)
   - Payer selection (with active user preference)
   - Participant selection and splitting
   - Document upload (if enabled)
   - Notes and recurrence
3. Advanced splitting options (even/shares/percentage/amount)
4. Real-time share calculation display

#### 3. Balance Settlement Flow
1. `/groups/{groupId}/balances` - View balances
2. Suggested reimbursements calculation
3. Create reimbursement expenses to settle debts
4. Export options (CSV, JSON)

#### 4. Receipt Scanning Flow (AI)
1. Camera/file selection
2. S3 upload
3. OpenAI processing
4. Form pre-population
5. Manual review and adjustment

### Advanced Features
- **Search & Filter**: Expense search with debounced input
- **Export**: CSV and JSON export of group data
- **PWA**: Offline capabilities and app installation
- **Activity Log**: Comprehensive audit trail
- **Recurring Expenses**: Automated expense creation
- **Multi-currency**: Per-group currency settings

---

## Technical Constraints & Considerations

### Data Integrity
- All monetary calculations use integer arithmetic (cents)
- Rounding applied consistently across balance calculations
- Cascade deletes maintain referential integrity
- Optimistic UI updates with proper error handling

### Performance Considerations
- tRPC with React Query for efficient data fetching
- Debounced search to reduce API calls
- Prisma connection pooling for database efficiency
- Client-side caching for groups and categories

### Security & Privacy
- No user authentication system (group-based access)
- S3 signed URLs for secure document access
- Environment variable validation
- CORS and API route protection

### Deployment Architecture
- **Vercel hosting** with automatic deployments
- **Vercel Postgres** for database
- **Docker support** for self-hosting
- **Environment-based feature flags**

### Technical Debt
- No formal user authentication (relies on localStorage)
- Limited input validation on monetary amounts
- S3 dependency for document features
- OpenAI API costs for AI features

---

## API Integration Points for Conversational AI

### Recommended Integration Strategy

#### 1. Non-Destructive Enhancement
- Preserve all existing tRPC endpoints
- Add new conversational endpoints alongside existing ones
- Maintain existing UI as primary interface
- Use feature flags for AI capabilities

#### 2. Natural Language Processing Entry Points
```typescript
// Suggested new endpoints
conversational: {
  parseIntent: (userMessage: string) => {
    action: 'create_expense' | 'view_balances' | 'create_group' | etc,
    parameters: extracted_parameters,
    confidence: number
  },
  createExpenseFromText: (groupId: string, message: string) => ExpenseFormValues,
  queryExpenses: (groupId: string, query: string) => Expense[],
  getGroupSummary: (groupId: string) => formatted_summary
}
```

#### 3. Context Management
- Leverage existing `currentGroupContext` for group-scoped conversations
- Use existing `activeUser` system for expense attribution
- Maintain conversation state separately from existing UI state

### Integration Points
1. **Group Context**: Use existing group context providers
2. **Form Validation**: Leverage existing Zod schemas
3. **Business Logic**: Reuse calculation functions from `lib/balances.ts` and `lib/totals.ts`
4. **Data Access**: Extend existing tRPC procedures
5. **AI Features**: Build upon existing OpenAI integration patterns

---

## Development Guidelines for AI Enhancement

### Preservation Requirements
1. **Maintain existing API contracts** - Do not modify existing tRPC procedures
2. **Preserve UI functionality** - All current features must remain accessible
3. **Respect data schemas** - Use existing Prisma models and validation
4. **Honor feature flags** - Follow existing configuration patterns
5. **Maintain i18n support** - Ensure new features support all languages

### Recommended Implementation Approach
1. **Feature flag new AI endpoints** to allow gradual rollout
2. **Add conversational UI as progressive enhancement** above existing forms
3. **Implement fallback mechanisms** to existing UI for complex operations
4. **Reuse existing business logic** rather than reimplementing calculations
5. **Follow existing error handling patterns** and user feedback mechanisms

### Testing Considerations
- Existing Jest configuration in place
- Preserve existing test patterns
- Add AI-specific test scenarios
- Validate against existing expense splitting edge cases

---

## Conclusion

Spliit represents a mature, well-architected expense sharing application with sophisticated business logic, comprehensive internationalization, and existing AI capabilities. The modular architecture with tRPC, strong typing with TypeScript/Zod, and clear separation of concerns provides an excellent foundation for adding conversational AI capabilities.

The key to successful AI enhancement lies in:
1. **Leveraging existing patterns** (tRPC procedures, Zod validation, component structure)
2. **Preserving existing functionality** as fallback mechanisms
3. **Building upon current AI integration** (OpenAI patterns, feature flags)
4. **Respecting architectural constraints** (integer arithmetic, cascade deletes, i18n support)

This brownfield documentation serves as the complete reference for implementing conversational AI features while maintaining the reliability and functionality that makes Spliit a production-ready expense sharing solution. 