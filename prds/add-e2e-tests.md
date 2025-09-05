# End-to-End Testing Plan for Spliit

## Overview

This document outlines a comprehensive E2E testing strategy for Spliit, a expense splitting application. The plan prioritizes testing the most critical user workflows while ensuring good coverage of core features.

## Application Features Analysis

Based on the codebase analysis, Spliit is a group expense management application with the following key features:

### Core Features
- **Group Management**: Create, edit, and manage expense groups with participants
- **Expense Management**: Add, edit, delete expenses with various categories
- **Split Modes**: Multiple ways to split expenses (evenly, by shares, by percentage, by amount)
- **Balance Tracking**: View participant balances and what they owe/are owed
- **Reimbursements**: Handle payments between participants
- **Recurring Expenses**: Set up expenses that repeat (daily, weekly, monthly)
- **Document Attachments**: Attach receipts/documents to expenses
- **Activity Tracking**: View history of group activities
- **Export Functionality**: Export data in CSV/JSON formats
- **Statistics**: View spending analytics and trends

### Technical Details
- Built with Next.js 14, TypeScript, tRPC, Prisma
- Uses PostgreSQL database
- Supports multiple currencies
- Internationalized (i18n) interface
- PWA capabilities

## Implementation Constraints

### Test ID Strategy
During the migration, **the only modification allowed to application files is adding test IDs** (`data-testid` attributes). This constraint ensures:
- Minimal impact on production code
- No risk of introducing bugs through test implementation
- Clean separation between test infrastructure and application logic
- Easy identification of test-specific elements

### Test ID Naming Convention
- Use kebab-case format: `data-testid="expense-card"`
- Be descriptive and specific: `data-testid="balance-amount-john"`
- Include context when needed: `data-testid="group-participant-list"`
- Avoid generic names: prefer `expense-title-input` over `input`

### Test ID Implementation Guidelines
1. **Strategic Placement**: Add test IDs only where needed for reliable element selection
2. **Minimal Footprint**: Don't add test IDs to every element, focus on key interaction points
3. **Future-Proof**: Choose stable elements that are unlikely to change frequently
4. **Documentation**: Maintain a registry of added test IDs for reference

### Test Development Workflow
**Mandatory Process**: After writing any new test, the development process **must run** `npm run test:e2e` to verify that:
- The new test passes successfully
- No existing tests are broken
- All test interactions work as expected
- Test reliability is maintained

This validation step is **required before continuing** with additional test development or implementation work.

## Priority-Based Testing Strategy

### Priority 1: Critical User Journeys (Must Have)

These are the core workflows that users perform most frequently:

#### 1. Group Creation and Management
- **Test**: `group-lifecycle.spec.ts`
- **Coverage**:
  - Create a new group with basic information
  - Add participants to the group
  - Edit group details (name, currency, information)
  - Navigate between group tabs (expenses, balances, information, stats, activity, settings)

#### 2. Basic Expense Management
- **Test**: `expense-basic.spec.ts`
- **Coverage**:
  - Create simple expense (equal split)
  - Edit existing expense
  - Delete expense
  - View expense details
  - Add expense notes

#### 3. Balance Calculation and Viewing
- **Test**: `balances-and-reimbursements.spec.ts`
- **Coverage**:
  - View participant balances after expenses
  - Verify balance calculations are correct
  - Create reimbursement from balance view
  - Mark reimbursements as completed

### Priority 2: Advanced Features (Should Have)

#### 4. Complex Expense Splitting
- **Test**: `expense-splitting.spec.ts`
- **Coverage**:
  - Split by shares
  - Split by percentage
  - Split by specific amounts
  - Exclude participants from expenses
  - Verify split calculations

#### 5. Categories and Organization
- **Test**: `categories-and-organization.spec.ts`
- **Coverage**:
  - Assign categories to expenses
  - Filter expenses by category
  - View category-based statistics

#### 6. Reimbursement Workflows
- **Test**: `reimbursement-flows.spec.ts`
- **Coverage**:
  - Create direct reimbursement
  - Generate reimbursement from suggestion
  - Track reimbursement status
  - Multiple reimbursement scenarios

### Priority 3: Advanced Functionality (Could Have)

#### 7. Recurring Expenses
- **Test**: `recurring-expenses.spec.ts`
- **Coverage**:
  - Set up daily recurring expense
  - Set up weekly recurring expense
  - Set up monthly recurring expense
  - Edit/cancel recurring expenses

#### 8. Document Management
- **Test**: `document-management.spec.ts`
- **Coverage**:
  - Upload receipt to expense
  - View attached documents
  - Remove documents
  - Multiple document attachments

#### 9. Data Export and Statistics
- **Test**: `export-and-stats.spec.ts`
- **Coverage**:
  - Export group data as CSV
  - Export group data as JSON
  - View spending statistics
  - Verify statistical calculations

#### 10. Activity Tracking
- **Test**: `activity-tracking.spec.ts`
- **Coverage**:
  - View activity feed
  - Verify activity entries for various actions
  - Activity timestamp accuracy

### Priority 4: Edge Cases and Error Handling (Nice to Have)

#### 11. Error Scenarios
- **Test**: `error-handling.spec.ts`
- **Coverage**:
  - Invalid input validation
  - Network error recovery
  - Large group management
  - Currency formatting edge cases

#### 12. Multi-User Workflows
- **Test**: `multi-user-scenarios.spec.ts`
- **Coverage**:
  - Multiple users in same group
  - Concurrent expense creation
  - Conflict resolution

## Test Implementation Structure

### Page Object Model (POM) Extensions

Extend the existing POM classes:

```typescript
// Additional POM classes needed:
- BalancePage.ts          // For balance viewing and interactions
- ReimbursementPage.ts    // For reimbursement workflows
- StatisticsPage.ts       // For stats and analytics
- ActivityPage.ts         // For activity tracking
- ExportPage.ts          // For data export functionality
- SettingsPage.ts        // For group settings and management
```

### Test Data Management

```typescript
// test-data/
- groups.ts              // Test group configurations
- expenses.ts            // Various expense scenarios
- participants.ts        // Participant data sets
- currencies.ts          // Different currency formats
```

### Utility Functions

```typescript
// utils/
- calculations.ts        // Balance and split calculation helpers
- currency.ts           // Currency formatting utilities
- date.ts               // Date manipulation for recurring expenses
- validation.ts         // Input validation helpers
```

## Test Execution Strategy

### Test Suites Organization

1. **Smoke Tests** (`smoke/`): Critical path tests that run on every commit
   - Basic group creation
   - Simple expense creation
   - Balance viewing

2. **Regression Tests** (`regression/`): Full feature coverage
   - All Priority 1 and 2 tests
   - Run on PRs and releases

3. **Extended Tests** (`extended/`): Comprehensive coverage
   - All priorities including edge cases
   - Run nightly or on demand

### Performance Considerations

- **Parallel Execution**: Group tests by functionality to run in parallel
- **Test Isolation**: Each test should create its own group/data
- **Cleanup**: Implement proper test data cleanup
- **Database**: Consider using test database with fast reset

### Browser Coverage

- **Primary**: Chrome (latest)
- **Secondary**: Firefox, Safari, Edge
- **Mobile**: Mobile Chrome and Safari viewports

## Success Metrics

### Coverage Goals
- **Critical Paths**: 100% coverage
- **Core Features**: 95% coverage
- **Advanced Features**: 80% coverage
- **Edge Cases**: 60% coverage

### Quality Gates
- All Priority 1 tests must pass for deployment
- No more than 2% flaky test rate
- Test execution time under 30 minutes for full suite
- 95% test reliability score

## Implementation Timeline

### Phase 1 (Week 1-2): Foundation
- **Identify and add required test IDs** to application components
- Extend POM architecture
- Implement Priority 1 tests
- Set up test data management
- Basic CI integration

### Phase 2 (Week 3-4): Core Features
- **Add additional test IDs** for Priority 2 features
- Implement Priority 2 tests
- Add utility functions
- Enhance test reliability
- Performance optimization

### Phase 3 (Week 5-6): Advanced Features
- **Complete test ID coverage** for remaining features
- Implement Priority 3 tests
- Cross-browser testing setup
- Test reporting and analytics
- Documentation completion

### Phase 4 (Week 7-8): Polish and Maintenance
- **Finalize test ID registry and documentation**
- Priority 4 tests implementation
- Test suite optimization
- Maintenance procedures
- Team training

## Maintenance and Evolution

### Regular Reviews
- Monthly test suite review for relevance
- Quarterly performance optimization
- Bi-annual architecture assessment

### Continuous Improvement
- Monitor test flakiness and fix root causes
- Add tests for new features immediately
- Update tests when UI/UX changes
- Regular dependency updates

## Risk Mitigation

### Common Pitfalls
- **Over-testing**: Focus on user value, not code coverage
- **Flaky tests**: Implement proper waits and retries
- **Slow execution**: Optimize test data and parallel execution
- **Maintenance burden**: Keep tests simple and focused

### Mitigation Strategies
- Regular test review and cleanup
- Investment in test infrastructure
- Clear ownership and responsibility
- Automated test health monitoring
- **Mandatory test validation**: Always run `npm run test:e2e` after each new test implementation

This plan provides a structured approach to achieving comprehensive E2E test coverage for Spliit while prioritizing the most critical user workflows and maintaining sustainable test maintenance practices.