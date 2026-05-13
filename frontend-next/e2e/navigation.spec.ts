import { test, expect } from '@playwright/test';

test.describe('Navigasi setelah login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'david@indohaircorp.co.id');
    await page.fill('input[type="password"]', 'indohair123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('dashboard tampil', async ({ page }) => {
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('navigasi ke Pembelian', async ({ page }) => {
    await page.click('a[href="/pembelian"]');
    await page.waitForURL('/pembelian');
    await expect(page.locator('a[href="/pembelian"]')).toBeVisible();
  });

  test('navigasi ke Master Data', async ({ page }) => {
    await page.click('a[href="/master-data"]');
    await page.waitForURL('/master-data');
    await expect(page.url()).toContain('/master-data');
  });

  test('navigasi ke Hutang Supplier', async ({ page }) => {
    await page.click('a[href="/supplier"]');
    await page.waitForURL('/supplier');
    await expect(page.url()).toContain('/supplier');
  });

  test('navigasi ke Fee Report', async ({ page }) => {
    await page.click('a[href="/fee-report"]');
    await page.waitForURL('/fee-report');
    await expect(page.url()).toContain('/fee-report');
  });
});
