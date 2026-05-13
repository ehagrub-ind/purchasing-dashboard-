import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('halaman login muncul', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login sebagai Owner berhasil', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'david@indohaircorp.co.id');
    await page.fill('input[type="password"]', 'indohair123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('login gagal dengan password salah', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'david@indohaircorp.co.id');
    await page.fill('input[type="password"]', 'salah123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=salah').first()).toBeVisible({ timeout: 5000 });
  });

  test('redirect ke login jika belum login', async ({ page }) => {
    await page.goto('/pembelian');
    await page.waitForURL('/login');
  });
});
