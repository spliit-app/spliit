# Spliit Conversational AI Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source**: IDE-based fresh analysis combined with user-provided comprehensive context

**Current Project State**: 
Spliit is a fully functional expense sharing application built with Next.js 14 and tRPC API. The app successfully handles expense splitting, balance calculations, reimbursements across 15 supported languages with i18n. It includes Progressive Web App capabilities with offline functionality and already has AI integration via OpenAI for receipt scanning. The system is production-ready and serving users effectively.

### Available Documentation Analysis

Based on the workspace structure, I can see:
✓ Tech Stack Documentation (Next.js 14, tRPC, Prisma)  
✓ Source Tree/Architecture (well-organized app structure)  
✓ API Documentation (tRPC routers structure)  
✓ External API Documentation (existing OpenAI integration)  
✓ Database Schema (Prisma migrations and schema.prisma)  
✓ i18n Implementation (15 language support)  
✓ PWA Configuration (manifest, offline capabilities)  

**Status**: Excellent existing documentation foundation from codebase analysis

### Enhancement Scope Definition

**Enhancement Type**: ✓ New Feature Addition (Conversational AI layer)

**Enhancement Description**: 
Adding a conversational AI interface layer to enable natural language interactions for all existing Spliit functionality. Users will be able to create expenses, check balances, manage groups, view history, and handle reimbursements through conversational commands using existing UI components for confirmation interfaces before execution.

**Impact Assessment**: ✓ **Minimal to Moderate Impact** (primarily additive with existing component reuse)

### Goals and Background Context

**Goals**:
- Transform existing UX into conversational AX through **confirmation-based workflow**
- Enable natural language input with **visual confirmation** before execution  
- **Reuse existing UI components** for confirmation interfaces
- Build upon existing OpenAI integration patterns for consistency
- Preserve data integrity through existing business logic **and user confirmation**

**Background Context**:
The Spliit app has proven its business logic and user workflows in production. With existing AI capabilities for receipt scanning, there's an opportunity to extend AI integration into conversational interactions. The enhancement implements a 'conversational intent → visual confirmation → execution' workflow, eliminating dual interface complexity while maintaining user confidence through familiar confirmation patterns. This approach leverages the robust foundation of tRPC APIs and business logic without requiring architectural changes.

### Change Log
| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|---------|
| Initial PRD | [Current Date] | 1.0 | Created brownfield enhancement PRD for conversational AI capabilities | John (PM) |
| Approach Revision | [Current Date] | 1.1 | Updated to confirmation-based workflow approach | John (PM) |

---

## Requirements

### Functional Requirements

**FR1**: Conversational AI shall interpret natural language input for expense creation and display parsed information in a confirmation interface before execution  
**FR2**: AI shall understand balance and reimbursement queries and present results using existing display components  
**FR3**: Group management commands shall be interpreted and confirmed through existing group creation/editing interfaces  
**FR4**: Expense history queries shall leverage existing filtering and display logic with AI-parsed parameters  
**FR5**: All conversational actions shall require user confirmation before executing changes to data  
**FR6**: AI shall provide helpful error messages when intent cannot be clearly determined  
**FR7**: Conversational interface shall support all 15 existing languages for input and responses  

### Non-Functional Requirements

**NFR1**: AI response time shall not exceed 3 seconds for intent interpretation  
**NFR2**: Enhancement shall reuse existing UI components for confirmation interfaces to maintain visual consistency  
**NFR3**: AI integration shall build upon existing OpenAI patterns and configuration  
**NFR4**: All existing tRPC API endpoints shall remain unchanged and be reused for data operations  
**NFR5**: Conversational features shall be progressive enhancement - existing UI remains fully functional  

### Compatibility Requirements

**CR1**: Existing API Compatibility - All current tRPC endpoints must remain unchanged and continue serving existing UI  
**CR2**: Database Schema Compatibility - No database schema changes required; AI works with existing data structures  
**CR3**: UI/UX Consistency - Confirmation interfaces must use existing design system and components  
**CR4**: Integration Compatibility - Build upon existing OpenAI integration patterns and environment configuration  

---

## User Interface Enhancement Goals

### Integration with Existing UI

The conversational AI interface will become the **primary interaction method** for all Spliit functionality, prominently featured and encouraged, while traditional UI remains accessible for users who prefer it. Users will initiate actions through natural language, see visual confirmation using familiar UI patterns, then approve execution.

**Primary Flow Architecture**:
- **Conversational Input**: Prominent primary interface with clear value messaging
- **AI Intent Parsing**: Interprets user intent and extracts structured data  
- **Visual Confirmation**: Existing UI components display parsed intent for verification
- **Execution**: Upon confirmation, actions execute through existing tRPC APIs
- **Traditional Access**: Full UI functionality remains available but positioned as alternative method

### Modified/New Screens and Views

**New Primary Interface**:
- Prominent Conversational Chat Interface (featured prominently on all screens)
- Persistent chat input with helpful prompts and examples
- AI response and confirmation flow components
- Onboarding flow highlighting conversational capabilities

**Repurposed Existing Screens**:
- Traditional navigation remains fully functional
- All existing screens serve dual purpose: direct use OR confirmation interfaces
- Conversational prompts and suggestions integrated into traditional views
- Clear visual hierarchy emphasizing conversational path while preserving choice

### UI Consistency Requirements

**Conversational-Prominent Design**:
- Chat interface prominently positioned with clear benefits messaging
- Traditional navigation accessible but visually de-emphasized
- Helpful conversational examples and prompts throughout interface
- Progressive disclosure guides users toward conversational interaction while respecting user preference

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript, JavaScript  
**Frameworks**: Next.js 14, React, tRPC  
**Database**: **Supabase** (PostgreSQL with real-time capabilities, auth, and APIs) - **Fresh Implementation**  
**Infrastructure**: Node.js runtime, PWA capabilities  
**External Dependencies**: OpenAI API (existing), **Supabase SDK**, shadcn/ui components, Tailwind CSS  
**Internationalization**: next-intl with 15 language support  

### Integration Approach

**Database Integration Strategy**: 
- **Supabase-First Architecture**: Leverage real-time subscriptions for conversational interfaces
- **Auth Integration**: Utilize Supabase Auth for user management
- **Real-time Capabilities**: Enable live conversation updates and collaborative features
- **Direct API Access**: Supabase client for efficient data operations

**API Integration Strategy**: 
- Build conversational layer on existing OpenAI integration patterns
- **Supabase Integration**: Leverage auth, real-time, and direct database access
- tRPC endpoints coordinate Supabase operations for complex business logic
- **Fresh Start Advantage**: No migration complexity, optimized architecture from day one

**Frontend Integration Strategy**: 
- Conversational interface becomes primary UX with real-time capabilities
- Existing components serve confirmation workflow
- Supabase real-time enables live conversation updates

**Testing Integration Strategy**: Extend existing Jest testing patterns for AI integration; test confirmation workflows using existing component testing approaches

### Code Organization and Standards

**File Structure Approach**:
```
src/
  components/
    conversational/     # New primary interface components
    confirmation/       # Existing components as confirmation interfaces
  lib/
    supabase/          # Supabase client and utilities
    ai/                # Conversational AI logic and prompts
    existing-apis/     # Current tRPC patterns
```

**Naming Conventions**: Follow existing camelCase for variables, PascalCase for components, kebab-case for file names

**Coding Standards**: Maintain existing TypeScript strict mode, ESLint configuration, and Prettier formatting

**Documentation Standards**: Extend existing JSDoc patterns for new AI-related functions; document AI prompt templates and intent parsing logic

### Deployment and Operations

**Build Process Integration**: Leverage existing Next.js build pipeline; no changes to deployment process required

**Deployment Strategy**: Feature can be deployed incrementally - AI components are additive and don't break existing functionality

**Monitoring and Logging**: Extend existing logging patterns for AI interactions; monitor OpenAI API usage alongside existing metrics

**Configuration Management**: Reuse existing environment variable patterns for OpenAI configuration; add new AI-specific config options following current conventions

### Risk Assessment and Mitigation

**Technical Risks**: 
- OpenAI API latency affecting user experience
- AI interpretation accuracy for complex expense scenarios  
- Increased API costs from conversational usage

**Integration Risks**:
- Existing component compatibility with AI-populated data
- i18n complexity for 15 languages in conversational context
- Progressive enhancement fallback scenarios

**Deployment Risks**:
- Feature flag needed for gradual rollout
- Monitoring required for AI interpretation accuracy

**Mitigation Strategies**:
- Implement timeout handling and fallback to manual input
- Extensive testing of AI-populated forms with existing validation
- Feature toggles for AI functionality
- Cost monitoring and usage limits for OpenAI API
- Comprehensive i18n testing for conversational features

### API Documentation Integration Strategy

**BMAD External API Documentation Structure**:
```
.bmad-core/
  data/
    external-apis/
      supabase-core-patterns.md    # Auth, queries, real-time for conversational AI
      openai-conversation.md       # Conversation patterns and prompt engineering
      integration-workflows.md     # How conversational AI coordinates with Supabase
```

**Focused Documentation Scope**:
- **Supabase Patterns**: Auth context, real-time subscriptions, query patterns for AI
- **OpenAI Integration**: Conversation management, prompt templates, response parsing
- **Coordination Patterns**: How AI interprets intent and translates to Supabase operations

---

## Epic Structure and Story Sequencing

Based on my analysis of your Supabase-first conversational AI enhancement, I believe this should be structured as a **single comprehensive epic** because all components are interdependent and build toward the same transformational goal. The conversational interface, confirmation workflows, and Supabase integration form one cohesive enhancement that delivers maximum value when implemented together.

**Epic Structure Decision**: **Single Epic Approach** - All conversational AI capabilities are interconnected and should be delivered as one cohesive enhancement to achieve the UX→AX transformation goal effectively.

---

## Epic 1: Conversational AI Enhancement for Spliit

**Epic Goal**: Transform Spliit into a conversational-first expense sharing application where users primarily interact through natural language while maintaining full traditional UI accessibility and leveraging Supabase-first architecture for optimal real-time conversational experiences.

**Integration Requirements**: Build upon existing OpenAI patterns, implement Supabase-first data architecture, reuse existing UI components for confirmation workflows, and maintain backward compatibility with all current functionality.

### Story 1.1: Supabase Foundation and Infrastructure Setup

**As a** developer,  
**I want** Supabase infrastructure established with proper authentication and database schema,  
**so that** the conversational AI has a robust real-time backend foundation.

#### Acceptance Criteria
1. Supabase project configured with authentication enabled
2. Database schema implemented matching existing data requirements (groups, expenses, users, activities)
3. Supabase client properly configured in Next.js application
4. Environment variables and configuration management established
5. Basic real-time subscription capabilities tested and working
6. API documentation created in `.bmad-core/data/external-apis/supabase-core-patterns.md`

#### Integration Verification
**IV1**: All existing tRPC endpoints continue functioning with Supabase backend  
**IV2**: Authentication flow works correctly with Supabase Auth  
**IV3**: Data operations (create, read, update, delete) maintain existing performance characteristics  
**IV4**: Real-time capabilities don't interfere with existing functionality  

### Story 1.2: Enhanced OpenAI Integration for Conversations

**As a** user,  
**I want** the system to interpret my natural language requests accurately,  
**so that** I can interact with the app conversationally.

#### Acceptance Criteria
1. OpenAI integration extended beyond receipt scanning to conversation interpretation
2. Intent parsing system capable of identifying expense creation, balance queries, group management, and history requests
3. Structured data extraction from natural language input
4. Error handling for ambiguous or unclear user intent
5. Multi-language support for conversational input across all 15 supported languages
6. API documentation created in `.bmad-core/data/external-apis/openai-conversation.md`

#### Integration Verification
**IV1**: Existing receipt scanning functionality remains unchanged and operational  
**IV2**: OpenAI API usage stays within reasonable cost parameters  
**IV3**: Response times don't exceed 3 seconds for intent interpretation  
**IV4**: Fallback mechanisms work when OpenAI is unavailable  

### Story 1.3: Conversational Input Interface Component

**As a** user,  
**I want** a prominent, accessible conversational interface,  
**so that** I can easily interact with the app using natural language.

#### Acceptance Criteria
1. Conversational chat interface component created using existing design system
2. Persistent input available across all application screens
3. Helpful prompts and examples guide users toward conversational interaction
4. Loading states and typing indicators for AI processing
5. Conversation history maintained during user session
6. Integration with existing theme and internationalization systems

#### Integration Verification
**IV1**: Traditional navigation and UI elements remain fully accessible  
**IV2**: Component doesn't interfere with existing page layouts or functionality  
**IV3**: Performance impact on page load times is minimal  
**IV4**: All existing keyboard shortcuts and accessibility features continue working  

### Story 1.4: Expense Creation Through Conversation

**As a** user,  
**I want** to create expenses by saying "I paid $50 for dinner with John and Jane",  
**so that** I can quickly log expenses without manual form entry.

#### Acceptance Criteria
1. AI accurately parses expense amount, description, participants, and categories from natural language
2. Existing expense creation form populated with AI-extracted data for user confirmation
3. All existing expense validation rules applied to AI-suggested data
4. User can modify AI suggestions before confirming expense creation
5. Expense creation executes through existing tRPC endpoints after confirmation
6. Support for various natural language patterns for expense description

#### Integration Verification
**IV1**: All existing expense creation functionality remains unchanged  
**IV2**: Expense validation, currency handling, and business logic unchanged  
**IV3**: Created expenses appear correctly in all existing expense views  
**IV4**: Expense splitting logic works identically to manual entry  

### Story 1.5: Balance and Reimbursement Queries

**As a** user,  
**I want** to ask "How much does John owe me?" and get instant answers,  
**so that** I can quickly check balances without navigating through the app.

#### Acceptance Criteria
1. AI interprets balance queries and identifies specific users or general balance requests
2. Responses displayed using existing balance display components
3. Support for reimbursement status queries ("Did John pay me back?")
4. Historical balance queries with date ranges
5. Multiple response formats (specific amounts, balance summaries, recent activity)
6. Integration with existing balance calculation logic

#### Integration Verification
**IV1**: Existing balance calculations and displays remain unchanged  
**IV2**: Balance accuracy maintained across all query methods  
**IV3**: Real-time balance updates continue working correctly  
**IV4**: Reimbursement tracking functions identically to existing implementation  

### Story 1.6: Group Management Through Conversation

**As a** user,  
**I want** to say "Create a new group for our Vegas trip" and have it set up automatically,  
**so that** I can efficiently manage multiple expense groups.

#### Acceptance Criteria
1. AI interprets group creation requests and extracts group name and initial participants
2. Existing group creation interface populated with AI suggestions for confirmation
3. Support for group member addition/removal through conversation
4. Group settings and preferences manageable through natural language
5. Integration with existing group management and permissions system
6. Group switching and navigation through conversational commands

#### Integration Verification
**IV1**: All existing group management functionality preserved  
**IV2**: Group permissions and access controls unchanged  
**IV3**: Multi-group workflows continue operating correctly  
**IV4**: Group sharing and invitation features remain intact  

### Story 1.7: Expense History and Analytics Queries

**As a** user,  
**I want** to ask "Show me all restaurant expenses this month" and get filtered results,  
**so that** I can analyze spending patterns conversationally.

#### Acceptance Criteria
1. AI interprets complex filtering requests (date ranges, categories, participants, amounts)
2. Results displayed using existing expense list and filtering components
3. Support for analytical queries ("How much did we spend on food last month?")
4. Export functionality accessible through conversational commands
5. Integration with existing search and filter capabilities
6. Visual charts and summaries generated from conversational queries

#### Integration Verification
**IV1**: Existing filtering and search functionality unchanged  
**IV2**: Export features continue working for both manual and AI-generated queries  
**IV3**: Performance maintained for large expense histories  
**IV4**: Data accuracy preserved across all query methods  

### Story 1.8: Confirmation Workflow Optimization and Polish

**As a** user,  
**I want** seamless confirmation experiences that feel natural and trustworthy,  
**so that** I'm confident in the AI's interpretation before actions execute.

#### Acceptance Criteria
1. Confirmation interfaces optimized for AI-suggested data display
2. Clear visual indicators showing AI-interpreted vs. user-modified data
3. One-click approval flow with detailed change summaries
4. Undo functionality for recently confirmed actions
5. Conversation context maintained across multiple related actions
6. Advanced help and examples for complex conversational patterns

#### Integration Verification
**IV1**: Existing confirmation and approval workflows unchanged  
**IV2**: Undo functionality works identically for manual and AI-initiated actions  
**IV3**: Data integrity maintained across all approval methods  
**IV4**: Audit trails and activity logs capture AI-initiated actions correctly  

---

### Critical Story Dependencies

- Stories 1.1 and 1.2 must complete before any user-facing conversational features
- Story 1.3 provides foundation for all subsequent user interaction stories
- Stories 1.4-1.7 can be developed in parallel once foundation is established
- Story 1.8 refines and optimizes all previous conversational capabilities

### Rollback Considerations

- Each story includes feature flags for immediate disable capability
- Supabase changes isolated to avoid affecting existing data
- AI features fail gracefully to traditional UI workflows
- Database schema changes are additive only, no destructive modifications

---

*This PRD provides comprehensive guidance for transforming Spliit into a conversational-first expense sharing application while maintaining all existing functionality and ensuring zero disruption to current users.* 