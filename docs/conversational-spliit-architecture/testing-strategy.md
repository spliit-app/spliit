# Testing Strategy

## Testing Pyramid
```
        E2E Tests (10%)
       /              \
  Integration Tests (30%)
     /                  \
Frontend Unit (30%) Backend Unit (30%)
```

## Test Organization

### Frontend Tests
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

### Backend Tests
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

### E2E Tests
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

## Test Examples

### Frontend Component Test
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

### E2E Test
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