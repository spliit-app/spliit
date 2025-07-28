# OpenAI Conversation Patterns for Spliit AI Enhancement

## Conversation Management

### Intent Classification System
```typescript
interface ConversationalIntent {
  type: 'expense_create' | 'balance_query' | 'group_manage' | 'expense_history' | 'reimbursement'
  confidence: number
  extractedData: any
  requiresConfirmation: boolean
}

const classifyIntent = async (userInput: string, context: ConversationContext) => {
  const prompt = `
  Analyze this expense-sharing app user input and extract intent:
  
  User: "${userInput}"
  Current Group: ${context.currentGroup?.name}
  Group Members: ${context.groupMembers?.map(m => m.name).join(', ')}
  
  Classify as one of: expense_create, balance_query, group_manage, expense_history, reimbursement
  Extract structured data for the identified intent.
  `
  
  return await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "system", content: prompt }],
    functions: [expenseCreationFunction, balanceQueryFunction, ...]
  })
}
```

### Expense Creation Prompt Templates

#### Primary Expense Creation Template
```typescript
const expenseCreationPrompt = `
You are an expense parsing assistant for a group expense app.

Extract expense details from natural language:
- Amount (with currency detection)
- Description 
- Participants (match to known group members)
- Category (food, transport, accommodation, entertainment, other)
- Date (default to today if not specified)

Known group members: {groupMembers}
Available categories: {categories}
Group currency: {currency}

Examples:
"I paid $50 for dinner with John and Jane" → 
{
  amount: 50,
  currency: "USD", 
  description: "dinner",
  participants: ["John", "Jane"],
  category: "food",
  paidBy: "current_user"
}

User input: "{userInput}"
Extract expense data:
`
```

#### Multi-language Support Pattern
```typescript
const localizedPrompts = {
  'en-US': expenseCreationPrompt,
  'es': `Eres un asistente para analizar gastos de grupo...`,
  'fr-FR': `Tu es un assistant pour analyser les dépenses de groupe...`,
  // ... 15 languages total
}

const getLocalizedPrompt = (locale: string, template: string) => {
  return localizedPrompts[locale] || localizedPrompts['en-US']
}
```

### Balance Query Patterns

#### Balance Inquiry Template
```typescript
const balanceQueryPrompt = `
Parse balance inquiry for expense-sharing app:

Group context: {groupName}
Members: {memberList}
Current user: {currentUser}

Query types:
1. Specific balance: "How much does John owe me?" 
2. General balance: "What's my balance?"
3. Group overview: "Show everyone's balances"
4. Historical: "What did I owe last month?"

User query: "{userInput}"

Extract:
- Query type
- Target users (if specific)
- Date range (if applicable)
- Response format preference
`
```

### Group Management Prompts

#### Group Creation Template  
```typescript
const groupCreationPrompt = `
Extract group creation details:

Input: "{userInput}"

Extract:
- Group name
- Initial members (emails or names)
- Currency preference 
- Group type/purpose

Examples:
"Create Vegas trip group" → { name: "Vegas trip", members: [], currency: "USD" }
"New group for roommates: John (john@email.com), Jane" → 
{ name: "roommates", members: ["john@email.com", "Jane"], currency: "USD" }
`
```

## Conversation Context Management

### Context Persistence
```typescript
interface ConversationContext {
  userId: string
  currentGroupId?: string
  groupMembers: Array<{id: string, name: string, email: string}>
  recentExpenses: Expense[]
  conversationHistory: ConversationTurn[]
  preferredCurrency: string
  locale: string
}

const maintainContext = (context: ConversationContext, newInput: string, response: any) => {
  // Update context based on successful actions
  if (response.type === 'expense_created') {
    context.recentExpenses.unshift(response.expense)
  }
  
  // Track conversation for follow-up references
  context.conversationHistory.push({
    input: newInput,
    response: response,
    timestamp: new Date()
  })
  
  return context
}
```

### Follow-up Conversation Handling
```typescript
const handleFollowUp = async (input: string, context: ConversationContext) => {
  const recentContext = context.conversationHistory.slice(-3) // Last 3 turns
  
  const followUpPrompt = `
  Recent conversation:
  ${recentContext.map(turn => `User: ${turn.input}\nApp: ${turn.response.summary}`).join('\n')}
  
  New input: "${input}"
  
  Determine if this is:
  1. Follow-up to recent action (modify, confirm, undo)
  2. New independent request
  3. Clarification/correction
  
  Handle accordingly with context awareness.
  `
}
```

## Error Handling and Clarification

### Ambiguity Resolution
```typescript
const handleAmbiguousInput = async (input: string, ambiguities: string[]) => {
  const clarificationPrompt = `
  User input was ambiguous: "${input}"
  
  Ambiguities detected: ${ambiguities.join(', ')}
  
  Generate helpful clarification questions:
  - Be specific about what needs clarification
  - Provide options when possible
  - Maintain conversational tone
  - Guide toward successful completion
  `
  
  return await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "system", content: clarificationPrompt }]
  })
}
```

### Fallback Strategies
```typescript
const fallbackResponses = {
  low_confidence: "I'm not sure I understood that correctly. Could you rephrase?",
  parsing_error: "I had trouble extracting the details. Could you be more specific?",
  context_missing: "I need more context. What group are you referring to?",
  permission_error: "You don't have permission for that action in this group."
}
```

## Function Calling Patterns

### Structured Response Functions
```typescript
const expenseCreationFunction = {
  name: "create_expense",
  description: "Extract expense creation data from natural language",
  parameters: {
    type: "object",
    properties: {
      amount: { type: "number" },
      currency: { type: "string" },
      description: { type: "string" },
      participants: { type: "array", items: { type: "string" } },
      category: { 
        type: "string",
        enum: ["food", "transport", "accommodation", "entertainment", "other"]
      },
      date: { type: "string", format: "date" },
      confidence: { type: "number" }
    },
    required: ["amount", "description", "participants"]
  }
}
```

## Performance Optimization

### Prompt Efficiency
- Keep prompts focused and concise
- Use examples relevant to expense sharing
- Cache common response patterns
- Batch multiple intents when possible

### Cost Management
```typescript
const optimizeForCost = {
  model: "gpt-3.5-turbo", // Use GPT-4 only for complex disambiguation
  max_tokens: 500, // Limit response length
  temperature: 0.1, // Consistent, focused responses
  cache_common_patterns: true
}
```

### Response Time Targets
- Intent classification: < 1 second
- Data extraction: < 2 seconds  
- Complex queries: < 3 seconds
- Fallback to manual input if exceeded 