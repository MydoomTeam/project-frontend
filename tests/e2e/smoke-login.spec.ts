import { expect, test } from '@playwright/test';

test('redirects unauthenticated users to login and renders the login form', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible();
  await expect(page.getByLabel('Usuario o correo electrónico')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toBeVisible();
  await expect(page.getByRole('button', { name: 'INICIAR SESIÓN' })).toBeVisible();
});
