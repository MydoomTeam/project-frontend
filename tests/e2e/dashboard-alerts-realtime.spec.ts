import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedSession, fulfillJson } from './helpers';

test('dashboard alert widget shows a new alert without page reload', async ({ page }) => {
  await bootstrapAuthenticatedSession(page, { id: 9, username: 'observer' }, { accelerateIntervals: true });

  let alertCalls = 0;

  await page.route(/\/(mock-api|api)?\/?tournaments\/available$/, async (route) => {
    await fulfillJson(route, []);
  });

  await page.route(/\/(mock-api|api)?\/?players\/9\/tournaments$/, async (route) => {
    await fulfillJson(route, []);
  });

  await page.route(/\/(mock-api|api)?\/?alerts$/, async (route) => {
    alertCalls += 1;

    if (alertCalls === 1) {
      await fulfillJson(route, {
        items: [],
        stats: { total: 0, new: 0, acknowledged: 0, critical: 0 },
        history: [],
      });
      return;
    }

    await fulfillJson(route, {
      items: [
        {
          id: 990,
          event_type: 'match_overdue',
          message: 'Partido #990 vencido. Estado actual: En curso.',
          created_at: '2026-07-05T12:00:00Z',
          status: 'nueva',
        },
      ],
      stats: { total: 1, new: 1, acknowledged: 0, critical: 1 },
      history: [
        {
          id: 1990,
          action: 'CREATE_ALERTA',
          action_label: 'Nueva alerta registrada',
          created_at: '2026-07-05T12:00:00Z',
          description: 'Partido #990 vencido',
          tournament_id: 45,
          tournament_name: 'Copa Alerta',
        },
      ],
    });
  });

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Alertas recientes' })).toBeVisible();
  await expect(page.getByText('Partido #990 vencido. Estado actual: En curso.')).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('No leida', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
});
