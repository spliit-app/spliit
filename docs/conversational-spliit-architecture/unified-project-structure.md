# Unified Project Structure

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
