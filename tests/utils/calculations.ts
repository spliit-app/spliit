export class CalculationUtils {
  /**
   * Calculate expected balance for a participant
   */
  static calculateExpectedBalance(
    participantExpenses: number[],
    participantShares: number[]
  ): number {
    const totalPaid = participantExpenses.reduce((sum, expense) => sum + expense, 0)
    const totalOwed = participantShares.reduce((sum, share) => sum + share, 0)
    
    return totalPaid - totalOwed
  }

  /**
   * Calculate even split amount
   */
  static calculateEvenSplit(totalAmount: number, participantCount: number): number {
    return totalAmount / participantCount
  }

  /**
   * Calculate split by percentage
   */
  static calculatePercentageSplit(totalAmount: number, percentage: number): number {
    return (totalAmount * percentage) / 100
  }

  /**
   * Calculate split by shares
   */
  static calculateShareSplit(totalAmount: number, shares: number, totalShares: number): number {
    return (totalAmount * shares) / totalShares
  }

  /**
   * Format currency amount to 2 decimal places
   */
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return `${currency}${amount.toFixed(2)}`
  }

  /**
   * Parse currency string to number
   */
  static parseCurrency(currencyString: string): number {
    return parseFloat(currencyString.replace(/[^0-9.-]+/g, ''))
  }

  /**
   * Validate that balances sum to zero (group balance check)
   */
  static validateGroupBalance(balances: number[]): boolean {
    const sum = balances.reduce((total, balance) => total + balance, 0)
    return Math.abs(sum) < 0.01 // Allow for small rounding errors
  }
}