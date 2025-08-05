export const testGroups = {
  basic: {
    name: 'Test Group',
    currency: 'USD',
    information: 'A test group for E2E testing',
    participants: ['Alice', 'Bob', 'Charlie']
  },
  
  family: {
    name: 'Family Expenses',
    currency: 'EUR',
    information: 'Family expense tracking',
    participants: ['Mom', 'Dad', 'Sister', 'Brother']
  },
  
  vacation: {
    name: 'Summer Vacation 2024',
    currency: 'USD',
    information: 'Vacation expenses for the group trip',
    participants: ['John', 'Jane', 'Mike', 'Sarah', 'Tom']
  },
  
  minimal: {
    name: 'Two Person Group',
    currency: 'USD',
    information: '',
    participants: ['Person1', 'Person2']
  }
}

export const generateUniqueGroupName = () => {
  const timestamp = Date.now()
  return `Test Group ${timestamp}`
}