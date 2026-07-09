import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedSession, fulfillJson } from './helpers';

test('alerts page shows a newly detected alert without manual reload', async ({ page }) => {
  await bootstrapAuthenticatedSession(page, { id: 1, username: 'admin' }, { accelerateIntervals: true });

  let alertCalls = 0;

  await page.route(/\/(mock-api|api)?\/?alerts$/, async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.continue();
      return;
    }
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
          id: 401,
          event_type: 'match_overdue',
          message: 'Partido #401 vencido. Estado actual: En curso.',
          created_at: '2026-07-05T12:00:00Z',
          status: 'nueva',
        },
      ],
      stats: { total: 1, new: 1, acknowledged: 0, critical: 1 },
      history: [
        {
          id: 9001,
          action: 'CREATE_ALERTA',
          action_label: 'Nueva alerta registrada',
          created_at: '2026-07-05T12:00:00Z',
          description: 'Partido #401 vencido',
          tournament_id: 88,
          tournament_name: 'Copa Relampago',
        },
      ],
    });
  });

  await page.goto('/alerts');

  await expect(page).toHaveURL(/\/alerts$/);
  await expect(page.getByText('Partido #401 vencido. Estado actual: En curso.')).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('Nueva alerta registrada')).toBeVisible();
  await expect(page).toHaveURL(/\/alerts$/);
});
