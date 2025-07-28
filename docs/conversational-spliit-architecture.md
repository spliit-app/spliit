# Conversational Spliit Fullstack Architecture Document

## Introduction

This document outlines the complete fullstack architecture for **Conversational Spliit**, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

### Starter Template or Existing Project

**Existing Project**: This architecture builds upon the existing mature Spliit application - a production-ready expense sharing application built with Next.js 14, tRPC, and Prisma. 

**Current State Analysis**:
- ✅ **Mature Codebase**: Fully functional expense splitting with sophisticated algorithms
- ✅ **Existing AI Integration**: OpenAI integration for receipt scanning and category extraction
- ✅ **Strong Foundation**: Next.js 14 App Router, tRPC APIs, Prisma ORM, PWA capabilities
- ✅ **International**: 15 language support with next-intl
- ✅ **Production Ready**: Deployed and serving users effectively

**Transformation Scope**: The architecture transformation involves:
1. **Migration from PostgreSQL → Supabase**: Leveraging real-time capabilities for conversational interfaces
2. **Conversational Layer Addition**: Natural language interface with confirmation-based workflows
3. **UX→AX Pattern Implementation**: Transform existing UI patterns into conversational confirmation workflows
4. **Component Reuse Strategy**: Existing forms become confirmation interfaces for AI-parsed intent
5. **Enhanced AI Integration**: Extend existing OpenAI patterns for conversational intelligence

**Constraints from Existing Architecture**:
- Must preserve all existing functionality as fallback
- Maintain current tRPC API contracts for backward compatibility  
- Respect existing business logic and calculation algorithms
- Honor existing i18n implementation across 15 languages
- Preserve existing PWA capabilities and offline functionality

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| Current | 1.0 | Initial conversational architecture for Supabase migration | Winston (Architect) | 

## High Level Architecture

### Technical Summary

The Conversational Spliit architecture implements a **hybrid conversational-first approach** with Supabase-powered real-time capabilities. The system maintains the existing Next.js 14/tRPC foundation while adding a conversational AI layer that transforms user intent into visual confirmations using existing UI components. Supabase replaces PostgreSQL to enable real-time conversation updates, collaborative features, and streamlined authentication with Google OAuth. The architecture follows a **conversation → parse → confirm → execute** pattern, where AI interprets natural language, populates familiar forms for user confirmation, then executes through existing business logic. This approach preserves data integrity and user confidence while achieving the UX→AX transformation goal.

### Platform and Infrastructure Choice

**Current Hosting Setup**: What platform are you currently using to host Spliit? (e.g., Vercel, Netlify, AWS, Google Cloud, self-hosted, etc.)

Based on conversational AI requirements and optimal Supabase integration, here are the platform recommendations:

**Optimal: Vercel + Supabase**
- ✅ **Real-time Excellence**: Native WebSocket support for instant conversation updates
- ✅ **Edge Functions Integration**: Supabase Edge Functions co-located with Vercel edge network
- ✅ **OpenAI Proximity**: Both Vercel and Supabase have optimized OpenAI API connections
- ✅ **Google OAuth Seamless**: Supabase Auth's best-in-class social provider integration
- ✅ **Conversational Performance**: Sub-100ms latency for AI response streaming
- ✅ **Jules Implementation**: Vercel's serverless functions ideal for AI agent orchestration

**Strong Alternative: Railway + Supabase**
- ✅ **Developer Experience**: Excellent for Next.js apps with real-time features
- ✅ **Cost Efficiency**: More predictable pricing than serverless for high AI usage
- ✅ **Full Control**: Better for custom Jules agent implementations
- ⚠️ **Edge Distribution**: Less global presence than Vercel

**Enterprise Option: AWS + Supabase**
- ✅ **Scale & Control**: Unlimited customization for complex AI workflows
- ✅ **Security Compliance**: Enterprise-grade security for sensitive financial data
- ✅ **AI Ecosystem**: Strong integration with AWS AI/ML services
- ⚠️ **Complexity**: Higher operational overhead
- ⚠️ **Real-time Setup**: Requires additional WebSocket infrastructure setup

**Not Recommended: Google Cloud + Firebase**
- ⚠️ **Supabase Conflict**: Firebase and Supabase serve similar purposes, creates redundancy
- ⚠️ **tRPC Compatibility**: Firebase functions less optimal for existing tRPC patterns

**Platform:** [Pending your current setup confirmation]
**Key Services:** [To be determined based on your hosting preference]
**Deployment Host and Regions:** [To be specified after platform selection]

### Repository Structure

**Structure:** Monorepo with enhanced organization for conversational features
**Monorepo Tool:** npm workspaces (consistent with existing Next.js setup)
**Package Organization:** Feature-based with shared conversational components

### Architectural Patterns

- **Jamstack with Real-time Enhancement:** Static generation with Supabase real-time subscriptions - _Rationale:_ Combines performance benefits with live conversational capabilities
- **Confirmation-First Conversational Pattern:** AI intent → visual confirmation → execution - _Rationale:_ Maintains user trust while enabling natural language interaction
- **Component Reuse Architecture:** Existing forms serve as confirmation interfaces - _Rationale:_ Minimizes development effort and maintains UI consistency
- **Event-Driven Conversational State:** Supabase real-time for conversation updates - _Rationale:_ Enables collaborative features and live conversation synchronization
- **Progressive Enhancement with AI:** Traditional UI remains fully functional - _Rationale:_ Zero disruption to existing users while encouraging conversational adoption
- **Hybrid API Strategy:** tRPC for complex business logic + Supabase client for real-time - _Rationale:_ Leverages existing investment while adding real-time capabilities 

### High Level Architecture Diagram

```mermaid
graph TB
    User[User] --> ConvUI[Conversational Interface]
    User --> TradUI[Traditional UI]
    
    ConvUI --> StateMan[Conversation State Manager]
    ConvUI --> AIGateway[AI Gateway with Fallback]
    
    AIGateway --> OpenAI[OpenAI API]
    AIGateway --> FallbackAI[Local Intent Parser]
    AIGateway --> Jules[Jules Agent Orchestrator]
    
    StateMan --> SupabaseRT[Supabase Real-time]
    TradUI --> tRPC[tRPC API Layer]
    Jules --> tRPC
    
    SupabaseRT --> ConvDB[(Conversation Context DB)]
    tRPC --> SupabaseCore[(Core Spliit DB)]
    
    Jules --> GoogleOAuth[Google OAuth via Supabase]
    Jules --> S3[AWS S3 Documents]
    
    ConvDB --> ConvUI
    SupabaseCore --> TradUI
```

### Critical Risk Mitigation Patterns

#### 1. Conversational Context State Management

**Technical Implementation:**

```typescript
// Supabase schema for conversation persistence
interface ConversationContext {
  id: string;
  user_id: string;
  group_id?: string;
  session_id: string; // Browser session identifier
  device_fingerprint: string; // For cross-device continuity
  conversation_state: {
    current_intent: string;
    parsed_entities: Record<string, any>;
    confirmation_pending: boolean;
    conversation_history: ConversationTurn[];
    context_variables: Record<string, any>;
  };
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface ConversationTurn {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  metadata: {
    intent_confidence?: number;
    entities_extracted?: Record<string, any>;
    fallback_used?: boolean;
  };
  timestamp: Date;
}
```

**Cross-Device State Sync Pattern:**

```typescript
// Real-time conversation state synchronization
const useConversationState = () => {
  const [state, setState] = useState<ConversationContext>();
  
  useEffect(() => {
    // Subscribe to real-time updates across devices
    const channel = supabase
      .channel(`conversation:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_contexts',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setState(payload.new as ConversationContext);
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [userId]);
  
  const updateContext = async (updates: Partial<ConversationContext>) => {
    await supabase
      .from('conversation_contexts')
      .upsert({
        ...state,
        ...updates,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry
      });
  };
  
  return { state, updateContext };
};
```

#### 2. OpenAI Fallback Strategy

**Technical Implementation:**

```typescript
// AI Gateway with graceful degradation
class AIGateway {
  async processConversationalInput(input: string, context: ConversationContext) {
    try {
      // Primary: OpenAI processing
      return await this.processWithOpenAI(input, context);
    } catch (error) {
      if (this.isOpenAIUnavailable(error)) {
        // Fallback 1: Local intent parsing
        const fallbackResult = await this.processWithLocalParser(input, context);
        if (fallbackResult.confidence > 0.7) {
          return { ...fallbackResult, fallback_used: 'local_parser' };
        }
        
        // Fallback 2: Direct UI transition
        return this.createUITransition(input, context);
      }
      throw error;
    }
  }
  
  private async processWithLocalParser(input: string, context: ConversationContext) {
    // Simple keyword-based intent detection for common patterns
    const patterns = {
      create_expense: /(?:i (?:paid|spent)|add expense|new expense).*?(\$?[\d,]+\.?\d*)/i,
      view_balances: /(?:who owes|balance|how much.*owe)/i,
      create_group: /(?:create|new|make).*?group.*?(?:for|called|named)\s+([^.!?]+)/i
    };
    
    for (const [intent, pattern] of Object.entries(patterns)) {
      const match = input.match(pattern);
      if (match) {
        return {
          intent,
          entities: this.extractSimpleEntities(match, intent),
          confidence: 0.8,
          fallback_reason: 'openai_unavailable'
        };
      }
    }
    
    return { intent: 'unknown', entities: {}, confidence: 0.1 };
  }
  
  private createUITransition(input: string, context: ConversationContext) {
    // Seamless transition to traditional UI with preserved context
    return {
      intent: 'ui_transition',
      action: 'redirect_with_context',
      target_route: this.inferTargetRoute(input),
      preserved_input: input,
      message: "I'm having trouble understanding. Let me take you to the right form with your input preserved."
    };
  }
}
```

**Fallback UI Component Pattern:**

```typescript
// Seamless transition component
const ConversationalFallback = ({ input, context, targetRoute }) => {
  const router = useRouter();
  
  const handleFallbackTransition = () => {
    // Preserve conversation context in URL params or localStorage
    const preservedState = {
      conversational_input: input,
      return_to_conversation: true,
      context_id: context.id
    };
    
    localStorage.setItem('fallback_context', JSON.stringify(preservedState));
    router.push(`${targetRoute}?from_conversation=true`);
  };
  
  return (
    <div className="border-l-4 border-orange-400 bg-orange-50 p-4">
      <div className="flex">
        <AlertTriangle className="h-5 w-5 text-orange-400" />
        <div className="ml-3">
          <p className="text-sm text-orange-700">
            I need a moment to understand your request better.
          </p>
          <button 
            onClick={handleFallbackTransition}
            className="mt-2 text-sm font-medium text-orange-700 hover:text-orange-600"
          >
            Continue with form → (your input will be preserved)
          </button>
        </div>
      </div>
    </div>
  );
};
```

#### 3. Jules Implementation Technical Guidance

**Agent Architecture Pattern:**

```typescript
// Jules autonomous agent implementation
class JulesAgent {
  constructor(
    private supabase: SupabaseClient,
    private aiGateway: AIGateway,
    private contextManager: ConversationContextManager
  ) {}
  
  async processUserMessage(message: string, userId: string, groupId?: string) {
    const context = await this.contextManager.getOrCreateContext(userId, groupId);
    
    // 1. Intent parsing with fallback
    const intentResult = await this.aiGateway.processConversationalInput(message, context);
    
    // 2. Entity validation and enrichment
    const enrichedEntities = await this.enrichEntities(intentResult.entities, context);
    
    // 3. Business logic validation
    const validationResult = await this.validateIntent(intentResult.intent, enrichedEntities);
    
    // 4. Generate confirmation interface
    const confirmationUI = await this.generateConfirmationUI(
      intentResult.intent, 
      enrichedEntities, 
      validationResult
    );
    
    // 5. Update conversation state
    await this.contextManager.updateContext(context.id, {
      current_intent: intentResult.intent,
      parsed_entities: enrichedEntities,
      confirmation_pending: true
    });
    
    return confirmationUI;
  }
  
  private async enrichEntities(entities: Record<string, any>, context: ConversationContext) {
    // Enrich with group context and user preferences
    if (context.group_id && !entities.participants) {
      const groupParticipants = await this.supabase
        .from('participants')
        .select('*')
        .eq('group_id', context.group_id);
      
      entities.available_participants = groupParticipants.data;
    }
    
    // Smart defaults from conversation context
    if (!entities.currency && context.conversation_state.context_variables.preferred_currency) {
      entities.currency = context.conversation_state.context_variables.preferred_currency;
    }
    
    return entities;
  }
  
  private async generateConfirmationUI(intent: string, entities: Record<string, any>, validation: any) {
    // Map intents to existing form components with AI-populated data
    const uiMappings = {
      create_expense: {
        component: 'ExpenseForm',
        prefillData: {
          title: entities.description,
          amount: entities.amount,
          paidBy: entities.payer || 'active_user',
          paidFor: entities.participants || [],
          category: entities.category,
          expenseDate: entities.date || new Date()
        }
      },
      create_group: {
        component: 'GroupForm',
        prefillData: {
          name: entities.group_name,
          participants: entities.participants || [],
          currency: entities.currency || '$'
        }
      },
      view_balances: {
        component: 'BalancesSummary',
        filters: {
          participant: entities.participant,
          dateRange: entities.date_range
        }
      }
    };
    
    return {
      confirmation_type: intent,
      ui_component: uiMappings[intent]?.component,
      prefill_data: uiMappings[intent]?.prefillData,
      validation_errors: validation.errors,
      confidence_level: validation.confidence
    };
  }
  
  async executeConfirmedAction(contextId: string, userConfirmation: any) {
    const context = await this.contextManager.getContext(contextId);
    
    // Execute through existing tRPC endpoints to preserve business logic
    switch (context.conversation_state.current_intent) {
      case 'create_expense':
        return this.executeExpenseCreation(userConfirmation, context);
      case 'create_group':
        return this.executeGroupCreation(userConfirmation, context);
      // ... other intents
    }
  }
  
  private async executeExpenseCreation(confirmation: any, context: ConversationContext) {
    // Use existing tRPC procedure to maintain business logic
    const trpcClient = createTRPCClient(/* config */);
    
    try {
      const result = await trpcClient.groups.expenses.create.mutate({
        groupId: context.group_id!,
        title: confirmation.title,
        amount: Math.round(confirmation.amount * 100), // Convert to cents
        paidById: confirmation.paidBy,
        paidFor: confirmation.paidFor,
        categoryId: confirmation.categoryId,
        expenseDate: confirmation.expenseDate
      });
      
      // Update conversation state with success
      await this.contextManager.updateContext(context.id, {
        confirmation_pending: false,
        context_variables: {
          ...context.conversation_state.context_variables,
          last_expense_id: result.id,
          recent_action: 'expense_created'
        }
      });
      
      return {
        success: true,
        expense: result,
        follow_up_message: `Great! I've created the expense "${confirmation.title}" for $${confirmation.amount}. Anything else I can help with?`
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallback_action: 'redirect_to_expense_form',
        preserved_data: confirmation
      };
    }
  }
}
```

**Integration with Existing Components:**

```typescript
// Enhanced expense form for AI confirmation
const EnhancedExpenseForm = ({ aiPrefillData, isConversationalMode = false }) => {
  const form = useForm({
    defaultValues: aiPrefillData || {}
  });
  
  return (
    <form>
      {isConversationalMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 mb-2">
            I understood your request as:
          </p>
          <div className="text-sm font-medium text-blue-800">
            "{aiPrefillData?.title}" for ${aiPrefillData?.amount}
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Review the details below and click confirm when ready.
          </p>
        </div>
      )}
      
      {/* Existing form fields with AI prefill highlighting */}
      <FormField
        name="title"
        render={({ field }) => (
          <Input 
            {...field} 
            className={aiPrefillData?.title ? "border-blue-300 bg-blue-50" : ""}
          />
        )}
      />
      {/* ... other fields */}
    </form>
  );
};
```

These technical patterns provide concrete implementation guidance for autonomous AI agents while addressing the critical risks of state management, fallback strategies, and seamless integration with existing components.

**Proceed to next section?** 

## Frontend Architecture

### Component Architecture

#### Component Organization
```
src/components/
├── conversational/           # Conversational AI components
│   ├── ConversationalInterface.tsx
│   ├── ConversationHistory.tsx
│   ├── MessageBubble.tsx
│   ├── TypingIndicator.tsx
│   └── VoiceInput.tsx
├── confirmation/             # AI confirmation interfaces
│   ├── AIConfirmationModal.tsx
│   ├── ConfirmationSummary.tsx
│   └── ModificationPanel.tsx
├── fallback/                 # Fallback UI components
│   ├── ConversationalFallback.tsx
│   ├── ErrorBoundary.tsx
│   └── OfflineIndicator.tsx
├── enhanced/                 # Enhanced existing components
│   ├── EnhancedExpenseForm.tsx
│   ├── EnhancedGroupForm.tsx
│   └── AIPrefilledInput.tsx
├── providers/                # Context providers
│   ├── ConversationProvider.tsx
│   ├── AuthProvider.tsx
│   └── RealtimeProvider.tsx
└── ui/                       # Existing shadcn/ui components
    ├── button.tsx
    ├── dialog.tsx
    └── ...
```

#### Component Template Pattern
```typescript
// Conversational component pattern
interface ConversationalComponentProps {
  isConversationalMode?: boolean;
  aiPrefillData?: Record<string, any>;
  onConversationalReturn?: () => void;
  conversationContext?: ConversationContext;
}

const ConversationalComponent: React.FC<ConversationalComponentProps> = ({
  isConversationalMode = false,
  aiPrefillData,
  onConversationalReturn,
  conversationContext
}) => {
  const { updateContext } = useConversationContext();
  
  // Enhanced component with AI awareness
  return (
    <div className="space-y-4">
      {isConversationalMode && (
        <ConversationalHeader 
          context={conversationContext}
          prefillData={aiPrefillData}
        />
      )}
      
      {/* Regular component content with AI enhancements */}
      <ComponentContent 
        defaultValues={aiPrefillData}
        highlightAIPrefilled={isConversationalMode}
      />
      
      {isConversationalMode && (
        <ConversationalFooter 
          onReturn={onConversationalReturn}
          onConfirm={() => updateContext({ confirmation_pending: false })}
        />
      )}
    </div>
  );
};
```

### State Management Architecture

#### State Structure
```typescript
// Zustand store for conversation state
interface ConversationStore {
  // Current conversation state
  activeContext: ConversationContext | null;
  isProcessing: boolean;
  currentIntent: string | null;
  
  // Real-time connection state
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  
  // UI state
  showConversationalInterface: boolean;
  confirmationModal: {
    isOpen: boolean;
    intent: string | null;
    prefillData: any;
  };
  
  // Actions
  setActiveContext: (context: ConversationContext) => void;
  updateContext: (updates: Partial<ConversationContext>) => void;
  openConfirmation: (intent: string, data: any) => void;
  closeConfirmation: () => void;
  setProcessing: (processing: boolean) => void;
}

// React Query for server state management
const conversationQueries = {
  activeContext: (userId: string, groupId?: string) => ({
    queryKey: ['conversation', 'active', userId, groupId],
    queryFn: () => trpc.conversational.getActiveContext.query({ group_id: groupId }),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!userId,
  }),
  
  conversationHistory: (contextId: string) => ({
    queryKey: ['conversation', 'history', contextId],
    queryFn: () => trpc.conversational.getConversationHistory.query({ context_id: contextId }),
    enabled: !!contextId,
  }),
};
```

#### State Management Patterns
- **Optimistic Updates**: Immediately update UI for user messages, rollback on error
- **Real-time Sync**: Supabase subscriptions for cross-device state synchronization
- **Persistence**: Zustand persist middleware for conversation preferences
- **Cache Invalidation**: React Query invalidation on conversation state changes

### Routing Architecture

#### Route Organization
```
src/app/
├── (auth)/                   # Auth-required routes
│   ├── groups/
│   │   ├── [groupId]/
│   │   │   ├── chat/         # New: Conversational interface
│   │   │   ├── expenses/     # Enhanced with AI features
│   │   │   ├── balances/
│   │   │   └── ...
│   │   └── create/
│   ├── profile/              # New: User preferences
│   └── conversations/        # New: Conversation history
├── api/
│   ├── trpc/[trpc]/
│   └── auth/                 # Supabase Auth callbacks
├── auth/                     # Auth pages
│   ├── signin/
│   └── callback/
└── (public)/                 # Public routes
    ├── page.tsx              # Landing page
    └── about/
```

#### Protected Route Pattern
```typescript
// Enhanced middleware with conversation context
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  // Protect authenticated routes
  if (req.nextUrl.pathname.startsWith('/(auth)') && !session) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }
  
  // Restore conversation context for authenticated users
  if (session && req.nextUrl.pathname.includes('/groups/')) {
    const groupId = req.nextUrl.pathname.split('/')[2];
    // Set conversation context headers for SSR
    res.headers.set('x-group-context', groupId);
    res.headers.set('x-user-id', session.user.id);
  }
  
  return res;
}
```

### Frontend Services Layer

#### API Client Setup
```typescript
// Enhanced tRPC client with auth context
import { createTRPCNext } from '@trpc/next';
import { createTRPCClient } from '@trpc/client';
import type { AppRouter } from '../server/api/root';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers: async () => {
            const supabase = createClientComponentClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            return {
              authorization: session ? `Bearer ${session.access_token}` : '',
            };
          },
        }),
      ],
    };
  },
  ssr: false,
});

// Supabase client for real-time features
export const supabaseClient = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});
```

#### Service Example
```typescript
// Conversational service with real-time capabilities
export class ConversationService {
  constructor(
    private supabase: SupabaseClient,
    private trpc: typeof trpc
  ) {}
  
  async sendMessage(message: string, groupId?: string) {
    // Optimistic update
    const tempTurn: ConversationTurn = {
      id: `temp-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date(),
      metadata: {},
    };
    
    // Add to local state immediately
    conversationStore.getState().addTurn(tempTurn);
    
    try {
      // Send to server
      const result = await this.trpc.conversational.parseIntent.mutate({
        message,
        group_id: groupId,
      });
      
      // Replace temp turn with actual result
      conversationStore.getState().replaceTurn(tempTurn.id, result.turns);
      
      return result;
    } catch (error) {
      // Rollback optimistic update
      conversationStore.getState().removeTurn(tempTurn.id);
      throw error;
    }
  }
  
  subscribeToConversation(contextId: string) {
    return this.supabase
      .channel(`conversation:${contextId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_turns',
        filter: `conversation_context_id=eq.${contextId}`,
      }, (payload) => {
        // Update local state with real-time changes
        conversationStore.getState().handleRealtimeUpdate(payload);
      })
      .subscribe();
  }
}
```

## Backend Architecture

### Service Architecture

#### Function Organization (Serverless with Supabase Edge Functions)
```
supabase/functions/
├── conversation-processor/   # Main conversation logic
│   ├── index.ts
│   ├── jules-agent.ts
│   ├── intent-parser.ts
│   └── entity-enricher.ts
├── ai-gateway/              # AI service abstraction
│   ├── index.ts
│   ├── openai-client.ts
│   └── fallback-parser.ts
├── context-manager/         # Conversation state management
│   ├── index.ts
│   ├── context-crud.ts
│   └── cleanup-scheduler.ts
└── shared/                  # Shared utilities
    ├── types.ts
    ├── validation.ts
    └── supabase-client.ts
```

#### Edge Function Template
```typescript
// Supabase Edge Function for conversation processing
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { JulesAgent } from './jules-agent.ts';

serve(async (req) => {
  try {
    // CORS handling
    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      });
    }
    
    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Initialize services
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Process conversation
    const { message, group_id } = await req.json();
    const jules = new JulesAgent(supabase);
    
    const result = await jules.processUserMessage(message, user.id, group_id);
    
    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
});
```

### Database Architecture

#### Data Access Layer
```typescript
// Repository pattern for conversation data
export class ConversationRepository {
  constructor(private supabase: SupabaseClient) {}
  
  async createContext(context: Omit<ConversationContext, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('conversation_contexts')
      .insert(context)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
  
  async updateContext(id: string, updates: Partial<ConversationContext>) {
    const { data, error } = await this.supabase
      .from('conversation_contexts')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
  
  async addConversationTurn(turn: Omit<ConversationTurn, 'id' | 'timestamp'>) {
    const { data, error } = await this.supabase
      .from('conversation_turns')
      .insert(turn)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
  
  async getActiveContext(userId: string, groupId?: string) {
    const query = this.supabase
      .from('conversation_contexts')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(1);
      
    if (groupId) {
      query.eq('group_id', groupId);
    } else {
      query.is('group_id', null);
    }
    
    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  }
  
  async cleanupExpiredContexts() {
    const { error } = await this.supabase
      .from('conversation_contexts')
      .delete()
      .lt('expires_at', new Date().toISOString());
      
    if (error) throw error;
  }
}
```

### Authentication and Authorization

#### Auth Flow
```mermaid
sequenceDiagram
    participant User
    participant NextjsApp as Next.js App
    participant Supabase as Supabase Auth
    participant Google as Google OAuth
    participant Database as Supabase DB
    
    User->>NextjsApp: Click "Sign in with Google"
    NextjsApp->>Supabase: auth.signInWithOAuth({provider: 'google'})
    Supabase->>Google: OAuth authorization request
    Google-->>User: Authorization consent screen
    User->>Google: Grant permission
    Google->>Supabase: Authorization code
    Supabase->>Google: Exchange code for tokens
    Google-->>Supabase: Access token + user info
    Supabase->>Database: Create/update user profile
    Supabase-->>NextjsApp: Session with JWT
    NextjsApp-->>User: Redirect to dashboard
    
    Note over NextjsApp, Database: Subsequent requests include JWT
    NextjsApp->>Supabase: API request with session token
    Supabase->>Database: Verify JWT and get user context
    Database-->>Supabase: User data
    Supabase-->>NextjsApp: Authorized response
```

#### Auth Middleware
```typescript
// Next.js middleware for auth and conversation context
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  // Refresh session if exists
  const { data: { session } } = await supabase.auth.getSession();
  
  // Auth protection
  const protectedPaths = ['/groups', '/profile', '/conversations'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  // Add user context to headers for conversation processing
  if (session) {
    res.headers.set('x-user-id', session.user.id);
    res.headers.set('x-user-email', session.user.email || '');
  }
  
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Unified Project Structure

```
conversational-spliit/
├── .github/                          # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml                   # Testing and linting
│       ├── deploy-frontend.yaml      # Vercel deployment
│       └── deploy-supabase.yaml      # Supabase migrations
├── apps/                             # Application packages
│   └── web/                          # Next.js frontend application
│       ├── src/
│       │   ├── app/                  # Next.js 14 App Router
│       │   │   ├── (auth)/           # Protected routes
│       │   │   │   ├── groups/
│       │   │   │   │   ├── [groupId]/
│       │   │   │   │   │   ├── chat/         # Conversational interface
│       │   │   │   │   │   ├── expenses/     # Enhanced expense management
│       │   │   │   │   │   ├── balances/
│       │   │   │   │   │   └── stats/
│       │   │   │   │   └── create/
│       │   │   │   ├── profile/              # User preferences
│       │   │   │   └── conversations/        # Conversation history
│       │   │   ├── api/
│       │   │   │   ├── trpc/[trpc]/         # tRPC endpoints
│       │   │   │   └── auth/                # Auth callbacks
│       │   │   ├── auth/                    # Auth pages
│       │   │   └── globals.css
│       │   ├── components/
│       │   │   ├── conversational/         # AI conversation components
│       │   │   ├── confirmation/           # AI confirmation interfaces
│       │   │   ├── enhanced/               # AI-enhanced existing components
│       │   │   ├── providers/              # Context providers
│       │   │   └── ui/                     # shadcn/ui components
│       │   ├── lib/
│       │   │   ├── supabase/               # Supabase client utilities
│       │   │   ├── ai/                     # AI integration utilities
│       │   │   ├── trpc/                   # tRPC configuration
│       │   │   └── utils.ts                # Shared utilities
│       │   ├── stores/                     # Zustand stores
│       │   │   ├── conversation.ts
│       │   │   ├── auth.ts
│       │   │   └── ui.ts
│       │   ├── hooks/                      # Custom React hooks
│       │   │   ├── useConversation.ts
│       │   │   ├── useAuth.ts
│       │   │   └── useRealtime.ts
│       │   └── types/                      # TypeScript type definitions
│       │       ├── conversation.ts
│       │       ├── ai.ts
│       │       └── database.ts
│       ├── supabase/                       # Supabase configuration
│       │   ├── functions/                  # Edge Functions
│       │   │   ├── conversation-processor/
│       │   │   ├── ai-gateway/
│       │   │   └── context-manager/
│       │   ├── migrations/                 # Database migrations
│       │   └── config.toml
│       ├── public/                         # Static assets
│       ├── tests/                          # Tests
│       │   ├── components/
│       │   ├── api/
│       │   ├── e2e/
│       │   └── utils/
│       ├── next.config.mjs
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── package.json
├── packages/                               # Shared packages
│   ├── shared/                            # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/                     # Shared TypeScript interfaces
│   │   │   │   ├── conversation.ts
│   │   │   │   ├── expense.ts
│   │   │   │   └── user.ts
│   │   │   ├── constants/                 # Shared constants
│   │   │   │   ├── categories.ts
│   │   │   │   └── currencies.ts
│   │   │   ├── utils/                     # Shared utilities
│   │   │   │   ├── calculations.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── formatting.ts
│   │   │   └── ai/                        # AI-related shared code
│   │   │       ├── prompts.ts
│   │   │       ├── intent-patterns.ts
│   │   │       └── fallback-parsers.ts
│   │   ├── tests/
│   │   └── package.json
│   ├── ui/                                # Shared AI-enhanced UI components
│   │   ├── src/
│   │   │   ├── conversational/
│   │   │   ├── confirmation/
│   │   │   └── enhanced/
│   │   └── package.json
│   └── config/                            # Shared configuration
│       ├── eslint/
│       ├── typescript/
│       ├── tailwind/
│       └── jest/
├── scripts/                               # Build and utility scripts
│   ├── setup-local-dev.sh
│   ├── migrate-supabase.sh
│   ├── seed-test-data.ts
│   └── deploy.sh
├── docs/                                  # Documentation
│   ├── prd.md
│   ├── conversational-spliit-architecture.md
│   ├── api-documentation.md
│   ├── deployment-guide.md
│   └── conversation-patterns.md
├── .env.example                           # Environment template
├── .env.local.example                     # Local development template
├── package.json                           # Root package.json
├── tsconfig.json                          # Root TypeScript config
├── turbo.json                             # Turborepo configuration
└── README.md
```

This project structure supports:
- **Monorepo Organization**: Clear separation between app and shared packages
- **Conversational Features**: Dedicated folders for AI-related components and utilities
- **Shared Types**: TypeScript interfaces shared between frontend and backend
- **Supabase Integration**: Edge Functions and migrations co-located with frontend
- **Testing Strategy**: Comprehensive test organization for all features
- **Development Workflow**: Scripts and configuration for efficient development 

## Data Models

### Core Spliit Models (Enhanced for Conversational Features)

#### Expense Model
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

#### ConversationContext Model
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

#### Enhanced User Model
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

## Database Schema

### Supabase Schema Definition

```sql
-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Users table (managed by Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{
    "defaultCurrency": "USD",
    "conversationalMode": true,
    "voiceInputEnabled": false,
    "confirmationLevel": "medium",
    "preferredLanguage": "en"
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Groups table
CREATE TABLE public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  information TEXT,
  currency TEXT DEFAULT 'USD',
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants table
CREATE TABLE public.participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation contexts table
CREATE TABLE public.conversation_contexts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  conversation_state JSONB NOT NULL DEFAULT '{
    "currentIntent": null,
    "parsedEntities": {},
    "confirmationPending": false,
    "conversationHistory": [],
    "contextVariables": {}
  }'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation turns table
CREATE TABLE public.conversation_turns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_context_id UUID REFERENCES public.conversation_contexts(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT
);

-- Expenses table (enhanced)
CREATE TABLE public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  paid_by_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  conversation_context_id UUID REFERENCES public.conversation_contexts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL, -- In cents
  category_id INTEGER REFERENCES public.categories(id) DEFAULT 0,
  expense_date DATE DEFAULT CURRENT_DATE,
  split_mode TEXT CHECK (split_mode IN ('EVENLY', 'BY_SHARES', 'BY_PERCENTAGE', 'BY_AMOUNT')) DEFAULT 'EVENLY',
  is_reimbursement BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense paid for (shares)
CREATE TABLE public.expense_paid_for (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  shares INTEGER NOT NULL DEFAULT 1
);

-- Expense documents
CREATE TABLE public.expense_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  original_filename TEXT,
  size_bytes INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log
CREATE TABLE public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversation_contexts_user_id ON public.conversation_contexts(user_id);
CREATE INDEX idx_conversation_contexts_expires_at ON public.conversation_contexts(expires_at);
CREATE INDEX idx_conversation_turns_context_id ON public.conversation_turns(conversation_context_id);
CREATE INDEX idx_expenses_conversation_context ON public.expenses(conversation_context_id);
CREATE INDEX idx_expenses_group_id_date ON public.expenses(group_id, expense_date DESC);

-- Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own conversations" ON public.conversation_contexts
  FOR ALL USING (auth.uid() = user_id);

-- Real-time subscriptions
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
```

## API Specification

### tRPC Router Extensions for Conversational Features

```typescript
// Extended tRPC router with conversational endpoints
export const conversationalRouter = createTRPCRouter({
  parseIntent: protectedProcedure
    .input(z.object({
      message: z.string().min(1),
      group_id: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const jules = new JulesAgent(ctx.supabase, ctx.openai);
      return jules.processUserMessage(input.message, ctx.user.id, input.group_id);
    }),

  getActiveContext: protectedProcedure
    .input(z.object({
      group_id: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const repo = new ConversationRepository(ctx.supabase);
      return repo.getActiveContext(ctx.user.id, input.group_id);
    }),

  updateContext: protectedProcedure
    .input(z.object({
      context_id: z.string().uuid(),
      updates: z.object({
        conversation_state: z.any().optional(),
        expires_at: z.date().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const repo = new ConversationRepository(ctx.supabase);
      return repo.updateContext(input.context_id, input.updates);
    }),

  confirmAction: protectedProcedure
    .input(z.object({
      context_id: z.string().uuid(),
      confirmation_data: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const jules = new JulesAgent(ctx.supabase, ctx.openai);
      return jules.executeConfirmedAction(input.context_id, input.confirmation_data);
    }),

  getConversationHistory: protectedProcedure
    .input(z.object({
      context_id: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('conversation_turns')
        .select('*')
        .eq('conversation_context_id', input.context_id)
        .order('timestamp', { ascending: false })
        .limit(input.limit);
      
      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
      
      return data.reverse(); // Return in chronological order
    }),
});

// Enhanced expense router with AI features
export const expensesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createExpenseSchema.extend({
      conversation_context_id: z.string().uuid().optional(),
      ai_generated: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Enhanced expense creation with conversation tracking
      const expense = await ctx.supabase
        .from('expenses')
        .insert({
          ...input,
          amount: Math.round(input.amount * 100), // Convert to cents
        })
        .select()
        .single();

      // Log activity with AI context
      if (input.ai_generated) {
        await ctx.supabase.from('activities').insert({
          group_id: input.group_id,
          type: 'expense_created_ai',
          data: {
            expense_id: expense.data?.id,
            conversation_context_id: input.conversation_context_id,
          },
        });
      }

      return expense;
    }),

  // ... other existing expense endpoints
});
```

## Development Workflow

### Local Development Setup

#### Prerequisites
```bash
# Required software
node >= 18.0.0
npm >= 9.0.0
git >= 2.30.0

# Supabase CLI
npm install -g supabase

# Vercel CLI (optional)
npm install -g vercel
```

#### Initial Setup
```bash
# Clone and setup
git clone https://github.com/your-org/conversational-spliit.git
cd conversational-spliit

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
cp .env.local.example .env.local

# Initialize Supabase local development
supabase init
supabase start
supabase db reset

# Seed development data
npm run seed:dev

# Generate types
npm run generate:types
```

#### Development Commands
```bash
# Start all services in development mode
npm run dev

# Start frontend only
npm run dev:web

# Start Supabase services
npm run dev:supabase

# Run tests
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:ai        # AI integration tests

# Database operations
npm run db:migrate     # Run migrations
npm run db:seed        # Seed test data
npm run db:reset       # Reset database

# Type generation
npm run generate:types # Generate Supabase types
npm run generate:trpc  # Generate tRPC types

# Build
npm run build          # Production build
npm run build:analyze  # Bundle analysis
```

### Environment Configuration

#### Required Environment Variables
```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend/Supabase (.env)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_s3_bucket_name
AWS_S3_REGION=your_s3_region

# Shared
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

## Security and Performance

### Security Requirements

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

### Performance Optimization

**Frontend Performance:**
- **Bundle Size Target**: < 500KB initial bundle, < 100KB route chunks
- **Loading Strategy**: Lazy loading for AI components, conversation history pagination
- **Caching Strategy**: React Query 5-minute cache, aggressive prefetching for groups

**Backend Performance:**
- **Response Time Target**: < 200ms API responses, < 3s AI processing
- **Database Optimization**: Indexed queries, connection pooling, read replicas for conversation history
- **Caching Strategy**: Supabase Edge Cache, conversation context caching

## Testing Strategy

### Testing Pyramid
```
        E2E Tests (10%)
       /              \
  Integration Tests (30%)
     /                  \
Frontend Unit (30%) Backend Unit (30%)
```

### Test Organization

#### Frontend Tests
```
tests/frontend/
├── components/
│   ├── conversational/
│   │   ├── ConversationalInterface.test.tsx
│   │   └── MessageBubble.test.tsx
│   ├── confirmation/
│   │   └── AIConfirmationModal.test.tsx
│   └── enhanced/
│       └── EnhancedExpenseForm.test.tsx
├── hooks/
│   ├── useConversation.test.ts
│   └── useRealtime.test.ts
├── services/
│   └── ConversationService.test.ts
└── utils/
    └── ai-helpers.test.ts
```

#### Backend Tests
```
tests/backend/
├── edge-functions/
│   ├── conversation-processor.test.ts
│   └── ai-gateway.test.ts
├── repositories/
│   └── ConversationRepository.test.ts
├── services/
│   └── JulesAgent.test.ts
└── integration/
    └── conversation-flow.test.ts
```

#### E2E Tests
```
tests/e2e/
├── conversation-flows/
│   ├── expense-creation.spec.ts
│   ├── balance-queries.spec.ts
│   └── group-management.spec.ts
├── fallback-scenarios/
│   ├── openai-unavailable.spec.ts
│   └── network-interruption.spec.ts
└── cross-device/
    └── conversation-continuity.spec.ts
```

### Test Examples

#### Frontend Component Test
```typescript
// ConversationalInterface.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConversationalInterface } from '../ConversationalInterface';
import { mockConversationContext } from '../../../test-utils/mocks';

describe('ConversationalInterface', () => {
  it('should process user message and show confirmation', async () => {
    const mockSendMessage = jest.fn().mockResolvedValue({
      intent: 'create_expense',
      confirmation_ui: { component: 'ExpenseForm', prefill_data: { title: 'Lunch', amount: 25 } }
    });

    render(
      <ConversationalInterface 
        onSendMessage={mockSendMessage}
        context={mockConversationContext}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Type your message...'), {
      target: { value: 'I paid $25 for lunch' }
    });
    
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('I paid $25 for lunch');
      expect(screen.getByText('I understood your request as:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Lunch')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });
  });
});
```

#### E2E Test
```typescript
// expense-creation.spec.ts
import { test, expect } from '@playwright/test';

test('complete conversational expense creation flow', async ({ page }) => {
  await page.goto('/groups/test-group-id');
  
  // Start conversation
  await page.click('[data-testid="chat-button"]');
  await page.fill('[data-testid="message-input"]', 'I paid $50 for dinner with John and Jane');
  await page.click('[data-testid="send-button"]');
  
  // Wait for AI processing
  await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
  await expect(page.locator('[data-testid="typing-indicator"]')).toBeHidden();
  
  // Verify confirmation interface
  await expect(page.locator('[data-testid="confirmation-modal"]')).toBeVisible();
  await expect(page.locator('input[name="title"]')).toHaveValue('dinner');
  await expect(page.locator('input[name="amount"]')).toHaveValue('50');
  
  // Confirm creation
  await page.click('[data-testid="confirm-button"]');
  
  // Verify expense was created
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  await page.goto('/groups/test-group-id/expenses');
  await expect(page.locator('text=dinner')).toBeVisible();
  await expect(page.locator('text=$50.00')).toBeVisible();
});
```

This comprehensive architecture document provides the complete technical foundation for implementing conversational AI features in Spliit while preserving existing functionality and enabling autonomous AI development. The architecture addresses all critical risks through specific technical patterns and maintains the high-quality standards expected from a production expense-sharing application. 