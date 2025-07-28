# Database Schema

## Supabase Schema Definition

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
