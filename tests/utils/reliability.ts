import { Page, Locator, expect } from '@playwright/test'

export class ReliabilityUtils {
  /**
   * Wait for element with multiple strategies and retries
   */
  static async waitForElement(
    page: Page, 
    selectors: string[], 
    options: { timeout?: number; retries?: number } = {}
  ): Promise<Locator> {
    const { timeout = 10000, retries = 3 } = options
    
    for (let attempt = 0; attempt < retries; attempt++) {
      for (const selector of selectors) {
        try {
          const element = page.locator(selector)
          await element.waitFor({ state: 'visible', timeout: timeout / retries })
          return element
        } catch (error) {
          // Continue to next selector
          continue
        }
      }
      
      if (attempt < retries - 1) {
        // Wait a bit before retry
        await page.waitForTimeout(1000)
        await page.waitForLoadState('networkidle')
      }
    }
    
    throw new Error(`None of the selectors found after ${retries} attempts: ${selectors.join(', ')}`)
  }

  /**
   * Navigate to tab with reliability checks
   */
  static async navigateToTab(page: Page, tabName: string, expectedUrl: RegExp) {
    // Click tab with retry and verification
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // Ensure we're in a stable state before clicking
        await page.waitForLoadState('networkidle')
        
        // Click the tab
        await page.getByTestId(`tab-${tabName}`).click()
        
        // Wait for the URL to change with a shorter timeout per attempt
        try {
          await page.waitForURL(expectedUrl, { timeout: 3000 })
          // If we get here, navigation succeeded
          break
        } catch (urlError) {
          // URL didn't change, try again
          if (attempt === 4) {
            // Last attempt failed, throw the error
            throw new Error(`Failed to navigate to ${tabName} tab after ${attempt + 1} attempts. Current URL: ${page.url()}`)
          }
          
          // Wait a bit before retrying
          await page.waitForTimeout(1000)
          continue
        }
      } catch (error) {
        if (attempt === 4) throw error
        await page.waitForTimeout(500)
      }
    }
    
    // Final stability checks
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  }

  /**
   * Verify content loaded with multiple fallback strategies
   */
  static async verifyContentLoaded(page: Page, contentIdentifiers: string[]) {
    let lastError: Error | null = null
    
    for (const identifier of contentIdentifiers) {
      try {
        if (identifier.startsWith('text=')) {
          await expect(page.locator(identifier)).toBeVisible({ timeout: 5000 })
          return
        } else if (identifier.startsWith('[data-testid=')) {
          await expect(page.locator(identifier)).toBeVisible({ timeout: 5000 })
          return  
        } else {
          await expect(page.getByTestId(identifier)).toBeVisible({ timeout: 5000 })
          return
        }
      } catch (error) {
        lastError = error as Error
        continue
      }
    }
    
    throw lastError || new Error(`No content identifiers found: ${contentIdentifiers.join(', ')}`)
  }

  /**
   * Enhanced page load waiting
   */
  static async waitForStablePage(page: Page) {
    // Wait for network to be idle
    await page.waitForLoadState('networkidle')
    
    // Wait for any pending JavaScript
    await page.waitForLoadState('domcontentloaded')
    
    // Additional short wait for dynamic content
    await page.waitForTimeout(300)
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError!
  }
}