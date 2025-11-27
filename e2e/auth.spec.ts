import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to login page', async ({ page }) => {
    // Assuming there's a login link or button
    const loginLink = page.getByRole('link', { name: /login|sign in/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');
    
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await submitButton.click();

    // Wait for validation errors
    const emailError = page.getByText(/email.*required/i);
    const passwordError = page.getByText(/password.*required/i);
    
    await expect(emailError.or(passwordError)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    await submitButton.click();

    // Wait for error message
    const errorMessage = page.getByText(/invalid|error|credentials/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    
    const signupLink = page.getByRole('link', { name: /sign up|create account/i });
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/.*signup/);
    }
  });

  test('should show validation errors for signup form', async ({ page }) => {
    await page.goto('/signup');
    
    const submitButton = page.getByRole('button', { name: /sign up|create account/i });
    await submitButton.click();

    // Wait for validation errors
    const emailError = page.getByText(/email.*required/i);
    await expect(emailError).toBeVisible();
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'differentpassword');
    
    const submitButton = page.getByRole('button', { name: /sign up/i });
    await submitButton.click();

    const errorMessage = page.getByText(/password.*match|do not match/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

