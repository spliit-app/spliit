# Frontend Architecture

## Component Architecture

### Component Organization
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

### Component Template Pattern
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

## State Management Architecture

### State Structure
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

### State Management Patterns
- **Optimistic Updates**: Immediately update UI for user messages, rollback on error
- **Real-time Sync**: Supabase subscriptions for cross-device state synchronization
- **Persistence**: Zustand persist middleware for conversation preferences
- **Cache Invalidation**: React Query invalidation on conversation state changes

## Routing Architecture

### Route Organization
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

### Protected Route Pattern
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

## Frontend Services Layer

### API Client Setup
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

### Service Example
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
