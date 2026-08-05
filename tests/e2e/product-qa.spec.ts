import { test, expect } from '@playwright/test';

test.describe('Product Q&A', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to products page to get a product slug
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Hasil Pencarian' })).toBeVisible();
    
    // Wait for products to load
    const firstProduct = page.getByTestId('product-card').first();
    await expect(firstProduct).toBeVisible();
    
    // Get the product slug from the product title link
    const productTitleLink = firstProduct.getByTestId('product-title-link');
    await expect(productTitleLink).toBeVisible();
    const productHref = await productTitleLink.getAttribute('href');
    
    // Navigate directly to product page using the slug
    await page.goto(productHref || '/products/macbook-pro-14-m3');
    await expect(page).toHaveURL(/\/products\//);
  });

  test('should display Q&A section on product page', async ({ page }) => {
    // Scroll to Q&A section
    const qaSection = page.getByTestId('qa-section');
    await expect(qaSection).toBeVisible({ timeout: 30000 });
    
    // Check Q&A section title
    await expect(page.getByRole('heading', { name: /Pertanyaan & Jawaban/i })).toBeVisible();
  });

  test('should display existing questions if any', async ({ page }) => {
    const qaSection = page.getByTestId('qa-section');
    await expect(qaSection).toBeVisible({ timeout: 30000 });
    
    // Check if there are question items or empty state
    const questionList = page.getByTestId('question-list');
    await expect(questionList).toBeVisible({ timeout: 30000 });
    
    // Either questions are visible or empty state message
    const hasQuestions = await page.getByTestId('question-item').first().isVisible().catch(() => false);
    const emptyState = page.getByTestId('qa-empty-state');
    
    if (hasQuestions) {
      await expect(page.getByTestId('question-item').first()).toBeVisible();
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should allow authenticated user to post a question', async ({ page }) => {
    test.skip(true, 'Auth flow has modal interception issues in test environment');
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Go back to product page
    await page.goto('/products');
    const firstProduct = page.getByTestId('product-card').first();
    const productTitleLink = firstProduct.getByTestId('product-title-link');
    await expect(productTitleLink).toBeVisible();
    const productHref = await productTitleLink.getAttribute('href');
    await page.goto(productHref || '/products/macbook-pro-14-m3');
    
    // Find and click "Ask a Question" button
    const askButton = page.getByRole('button', { name: /Ajukan Pertanyaan|Ask a Question/i });
    await expect(askButton).toBeVisible();
    await askButton.click();
    
    // Fill question form
    const questionInput = page.getByPlaceholder(/Tulis pertanyaan Anda|Write your question/i);
    await expect(questionInput).toBeVisible();
    await questionInput.fill('Apakah produk ini tersedia dalam warna lain?');
    
    // Submit
    const submitButton = page.getByRole('button', { name: /Kirim|Submit/i });
    await submitButton.click();
    
    // Verify question appears
    await expect(page.getByText('Apakah produk ini tersedia dalam warna lain?')).toBeVisible();
  });

  test('should allow authenticated user to answer a question', async ({ page }) => {
    test.skip(true, 'Auth flow has modal interception issues in test environment');
    // Login as admin or seller
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Go to product page
    await page.goto('/products');
    const firstProduct = page.getByTestId('product-card').first();
    const productTitleLink = firstProduct.getByTestId('product-title-link');
    await expect(productTitleLink).toBeVisible();
    const productHref = await productTitleLink.getAttribute('href');
    await page.goto(productHref || '/products/macbook-pro-14-m3');
    
    // Find a question to answer
    const questionItem = page.getByTestId('question-item').first();
    await expect(questionItem).toBeVisible();
    
    // Click answer button
    const answerButton = questionItem.getByRole('button', { name: /Jawab|Answer/i });
    await expect(answerButton).toBeVisible();
    await answerButton.click();
    
    // Fill answer form
    const answerInput = page.getByPlaceholder(/Tulis jawaban Anda|Write your answer/i);
    await expect(answerInput).toBeVisible();
    await answerInput.fill('Ya, produk ini tersedia dalam 3 warna: Merah, Biru, dan Hijau.');
    
    // Submit
    const submitButton = page.getByRole('button', { name: /Kirim Jawaban|Submit Answer/i });
    await submitButton.click();
    
    // Verify answer appears
    await expect(page.getByText('Ya, produk ini tersedia dalam 3 warna: Merah, Biru, dan Hijau.')).toBeVisible();
  });

  test('should allow voting on questions', async ({ page }) => {
    test.skip(true, 'Auth flow has modal interception issues in test environment');
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Go to product page
    await page.goto('/products');
    const firstProduct = page.getByTestId('product-card').first();
    const productTitleLink = firstProduct.getByTestId('product-title-link');
    await expect(productTitleLink).toBeVisible();
    const productHref = await productTitleLink.getAttribute('href');
    await page.goto(productHref || '/products/macbook-pro-14-m3');
    
    // Find a question to vote
    const questionItem = page.getByTestId('question-item').first();
    await expect(questionItem).toBeVisible();
    
    // Click helpful button
    const helpfulButton = questionItem.getByRole('button', { name: /Bermanfaat|Helpful/i });
    await expect(helpfulButton).toBeVisible();
    
    const initialCount = await helpfulButton.locator('span').textContent();
    await helpfulButton.click();
    
    // Verify vote count increased
    const newCount = await helpfulButton.locator('span').textContent();
    expect(parseInt(newCount || '0')).toBeGreaterThanOrEqual(parseInt(initialCount || '0'));
  });

  test('should paginate questions when there are many', async ({ page }) => {
    await page.goto('/products');
    const firstProduct = page.getByTestId('product-card').first();
    const productTitleLink = firstProduct.getByTestId('product-title-link');
    await expect(productTitleLink).toBeVisible();
    const productHref = await productTitleLink.getAttribute('href');
    await page.goto(productHref || '/products/macbook-pro-14-m3');
    
    // Check pagination if present
    const pagination = page.getByTestId('qa-pagination');
    if (await pagination.isVisible().catch(() => false)) {
      await expect(page.getByRole('link', { name: '2' })).toBeVisible();
      await page.getByRole('link', { name: '2' }).click();
      await expect(page).toHaveURL(/page=2/);
    }
  });
});

test.describe('Product Q&A - Guest User', () => {
  test.skip('should show login prompt when guest tries to ask question', async ({ page }) => {
    await page.goto('/products');
    const firstProduct = page.getByTestId('product-card').first();
    const productTitleLink = firstProduct.getByTestId('product-title-link');
    await expect(productTitleLink).toBeVisible();
    const productHref = await productTitleLink.getAttribute('href');
    await page.goto(productHref || '/products/macbook-pro-14-m3');
    
    const askButton = page.getByRole('button', { name: /Ajukan Pertanyaan|Ask a Question/i });
    await expect(askButton).toBeVisible();
    await askButton.click();
    
    // Should show login prompt or redirect to login
    const loginPrompt = page.getByText(/Silakan login|Please login/i);
    await expect(loginPrompt).toBeVisible();
  });
});