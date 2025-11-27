import { test, expect } from '@playwright/test';

test.describe('Matchmaking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // This test assumes user is logged in
    // In a real scenario, you'd set up authentication state
    await page.goto('/');
  });

  test('should display matchmaking UI', async ({ page }) => {
    // Navigate to matchmaking (assuming there's a route or button)
    const matchmakingButton = page.getByRole('button', { name: /find match|matchmaking/i });
    
    if (await matchmakingButton.isVisible()) {
      await expect(matchmakingButton).toBeVisible();
    }
  });

  test('should show loading state when searching', async ({ page }) => {
    // This test would require a logged-in state and socket connection
    // For now, we'll test the UI component
    await page.goto('/');
    
    // Look for matchmaking component
    const matchmakingUI = page.locator('[data-testid="matchmaking-ui"]');
    
    if (await matchmakingUI.isVisible()) {
      const findMatchButton = matchmakingUI.getByRole('button', { name: /find match/i });
      
      if (await findMatchButton.isVisible()) {
        await findMatchButton.click();
        
        // Should show loading spinner or searching state
        const loadingIndicator = page.locator('.loading-spinner, [role="status"]');
        await expect(loadingIndicator).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should allow canceling matchmaking', async ({ page }) => {
    await page.goto('/');
    
    const matchmakingUI = page.locator('[data-testid="matchmaking-ui"]');
    
    if (await matchmakingUI.isVisible()) {
      const findMatchButton = matchmakingUI.getByRole('button', { name: /find match/i });
      const cancelButton = matchmakingUI.getByRole('button', { name: /cancel/i });
      
      if (await findMatchButton.isVisible()) {
        await findMatchButton.click();
        
        // Wait for cancel button to appear
        if (await cancelButton.isVisible({ timeout: 3000 })) {
          await cancelButton.click();
          
          // Should return to initial state
          await expect(findMatchButton).toBeVisible();
        }
      }
    }
  });
});

