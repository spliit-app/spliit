# API Specification

## tRPC Router Extensions for Conversational Features

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
