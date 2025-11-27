import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for buttons with aria-labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // At least some buttons should have aria-label or accessible text
      const firstButton = buttons.first();
      const ariaLabel = await firstButton.getAttribute('aria-label');
      const textContent = await firstButton.textContent();
      
      expect(ariaLabel || textContent).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check for h1
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    
    // Should have at least one h1
    expect(h1Count).toBeGreaterThan(0);
  });

  test('should have theme toggle with proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    
    const themeToggle = page.getByRole('button', { name: /theme|dark|light/i });
    
    if (await themeToggle.isVisible()) {
      const ariaLabel = await themeToggle.getAttribute('aria-label');
      const ariaPressed = await themeToggle.getAttribute('aria-pressed');
      
      expect(ariaLabel).toBeTruthy();
      expect(ariaPressed).toBeTruthy();
    }
  });

  test('should have loading states with proper ARIA', async ({ page }) => {
    await page.goto('/login');
    
    // Fill form and submit to trigger loading
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await submitButton.click();
    
    // Check for loading spinner with proper ARIA
    const loadingSpinner = page.locator('[role="status"]');
    
    // May or may not be visible depending on response time
    if (await loadingSpinner.isVisible({ timeout: 1000 })) {
      const ariaLabel = await loadingSpinner.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});

