import { test, expect } from '@playwright/test';

// Test base URL
const BASE_URL = 'http://localhost:3000';

test.beforeEach(async ({ page }) => {
  // Clear DB and login before each test
  await page.goto(`${BASE_URL}/login`);
});

test('login flow', async ({ page }) => {
  await page.fill('input:first-of-type', 'admin');
  await page.fill('input:nth-of-type(2)', 'databotics');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);
  await expect(page).toHaveURL(`${BASE_URL}/upload`);
});

test('upload page', async ({ page }) => {
  // Login first
  await page.fill('input:first-of-type', 'admin');
  await page.fill('input:nth-of-type(2)', 'databotics');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);

  // Should be on upload page
  await expect(page).toHaveURL(`${BASE_URL}/upload`);
  await expect(page.locator('text=Upload Dataset')).toBeVisible();
});

test('navigate to sessions page', async ({ page }) => {
  await page.fill('input:first-of-type', 'admin');
  await page.fill('input:nth-of-type(2)', 'databotics');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE_URL}/sessions`);
  await expect(page).toHaveURL(`${BASE_URL}/sessions`);
  await expect(page.locator('text=Sessions')).toBeVisible();
});

test('navigate to insights page', async ({ page }) => {
  await page.fill('input:first-of-type', 'admin');
  await page.fill('input:nth-of-type(2)', 'databotics');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE_URL}/insights`);
  await expect(page).toHaveURL(`${BASE_URL}/insights`);
  await expect(page.locator('text=AI Insights')).toBeVisible();
});

test('navigate to connections page', async ({ page }) => {
  await page.fill('input:first-of-type', 'admin');
  await page.fill('input:nth-of-type(2)', 'databotics');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE_URL}/connections`);
  await expect(page).toHaveURL(`${BASE_URL}/connections`);
  await expect(page.locator('text=Database Connections')).toBeVisible();
});

test('navigate to notifications page', async ({ page }) => {
  await page.fill('input:first-of-type', 'admin');
  await page.fill('input:nth-of-type(2)', 'databotics');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE_URL}/notifications`);
  await expect(page).toHaveURL(`${BASE_URL}/notifications`);
  await expect(page.locator('text=Notifications')).toBeVisible();
});

test('dark mode is enabled', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  const html = await page.locator('html');
  await expect(html).toHaveClass(/dark/);
});

test('navigation sidebar visible', async ({ page }) => {
  await page.fill('input:first-of-type', 'admin');
  await page.fill('input:nth-of-type(2)', 'databotics');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);

  // Should see sidebar items
  await expect(page.locator('text=Upload')).toBeVisible();
  await expect(page.locator('text=Sessions')).toBeVisible();
  await expect(page.locator('text=Insights')).toBeVisible();
  await expect(page.locator('text=Connections')).toBeVisible();
});
