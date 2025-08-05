export const testExpenses = {
  simple: {
    title: 'Coffee',
    amount: '4.50',
    category: 'Food & Drinks',
    notes: 'Morning coffee'
  },
  
  coffee: {
    title: 'Coffee',
    amount: '4.50',
    category: 'Food & Drinks',
    notes: 'Morning coffee'
  },
  
  restaurant: {
    title: 'Dinner at Restaurant',
    amount: '85.20',
    category: 'Food & Drinks',
    notes: 'Group dinner'
  },
  
  grocery: {
    title: 'Grocery Shopping',
    amount: '156.78',
    category: 'Food & Drinks',
    notes: 'Weekly groceries'
  },
  
  transport: {
    title: 'Taxi Ride',
    amount: '23.50',
    category: 'Transportation',
    notes: 'Airport transfer'
  },
  
  accommodation: {
    title: 'Hotel Stay',
    amount: '320.00',
    category: 'Accommodation',
    notes: '2 nights hotel booking'
  },
  
  entertainment: {
    title: 'Movie Tickets',
    amount: '42.00',
    category: 'Entertainment',
    notes: 'Cinema tickets for 3 people'
  }
}

export const splitModes = {
  evenly: 'EVENLY',
  byShares: 'BY_SHARES',
  byPercentage: 'BY_PERCENTAGE',
  byAmount: 'BY_AMOUNT'
}

export const generateUniqueExpenseTitle = () => {
  const timestamp = Date.now()
  return `Test Expense ${timestamp}`
}