import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedSession, fulfillJson } from './helpers';

test('dashboard updates tournament status without a page reload', async ({ page }) => {
  await bootstrapAuthenticatedSession(page, { id: 7, username: 'captain' }, { accelerateIntervals: true });

  let historyCalls = 0;

  await page.route(/\/(mock-api|api)?\/?tournaments\/available$/, async (route) => {
    await fulfillJson(route, []);
  });

  await page.route(/\/(mock-api|api)?\/?alerts$/, async (route) => {
    await fulfillJson(route, { items: [], stats: { total: 0, new: 0, acknowledged: 0, critical: 0 }, history: [] });
  });

  await page.route(/\/(mock-api|api)?\/?players\/7\/tournaments$/, async (route) => {
    historyCalls += 1;
    const status = historyCalls === 1 ? 'Listo para iniciar' : 'En curso';
    await fulfillJson(route, [{
      id: 88,
      name: 'Copa Relampago',
      elimination_type: 'Eliminación Sencilla',
      rounds: 3,
      status,
      is_creator: true,
      registration_status: 'Confirmado',
    }]);
  });

  const startedAt = Date.now();
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Copa Relampago')).toBeVisible();
  await expect(page.getByText('En curso').first()).toBeVisible({ timeout: 3000 });
  expect(Date.now() - startedAt).toBeLessThan(5000);
  await expect(page).toHaveURL(/\/dashboard$/);
});
