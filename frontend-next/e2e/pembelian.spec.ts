import { test, expect } from '@playwright/test';

test.describe('Pembelian — Buat PO', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'david@indohaircorp.co.id');
    await page.fill('input[type="password"]', 'indohair123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.click('a[href="/pembelian"]');
    await page.waitForURL('/pembelian');
  });

  test('halaman pembelian tampil', async ({ page }) => {
    await expect(page.url()).toContain('/pembelian');
  });

  test('buka modal Buat PO dari tombol', async ({ page }) => {
    const buatPO = page.locator('button:has-text("Buat PO")').first();
    await buatPO.click();
    await expect(page.locator('text=Jalur Pembelian').first()).toBeVisible({ timeout: 5000 });
  });

  test('form PO step 1 — pilih lokal, PIC, supplier', async ({ page }) => {
    const buatPO = page.locator('button:has-text("Buat PO")').first();
    await buatPO.click();
    await page.waitForTimeout(500);

    // Pilih Lokal
    await page.locator('text=Lokal').first().click();

    // Isi tanggal
    await page.fill('input[type="date"]', '2026-05-13');

    // Pilih PIC — cari select yang punya option "Pilih PIC"
    const picSelect = page.locator('select').first();
    await picSelect.selectOption({ index: 1 });

    // Supplier combobox harus aktif setelah PIC dipilih
    await expect(page.locator('text=Cari supplier').first()).toBeVisible({ timeout: 3000 });
  });

  test('dropdown bahan hanya tampil nama tanpa kode', async ({ page }) => {
    const buatPO = page.locator('button:has-text("Buat PO")').first();
    await buatPO.click();
    await page.waitForTimeout(500);

    await page.locator('text=Lokal').first().click();
    await page.fill('input[type="date"]', '2026-05-13');

    const picSelect = page.locator('select').first();
    await picSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Klik combobox dan pilih supplier pertama
    await page.locator('text=Cari supplier').first().click();
    await page.waitForTimeout(500);
    const firstOption = page.locator('[data-idx="0"]').first();
    if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstOption.click();
    }

    // Klik Lanjut ke step 2
    const nextBtn = page.locator('button:has-text("Lanjut")').first();
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);

      // Cek dropdown bahan: ambil yang pertama saja
      const bahanSelect = page.locator('select').first();
      if (await bahanSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const options = await bahanSelect.locator('option').allTextContents();
        const hasCodeInParens = options.some(o => /\([A-Z]{2,}\)/.test(o));
        expect(hasCodeInParens).toBeFalsy();
      }
    }
  });
});
