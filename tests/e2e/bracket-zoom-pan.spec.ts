import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedSession, fulfillJson } from './helpers';

const tournament = {
  id: 222,
  name: 'Liga Extensa',
  elimination_type: 'Eliminación Sencilla',
  rounds: 6,
  status: 'En curso',
  creator_id: 99,
  creator_name: 'organizador',
  total_participants: 40,
};

const matches = {
  tournament_id: 222,
  tournament_status: 'En curso',
  matches: [
    {
      id: 11,
      tournament_id: 222,
      round: 1,
      position: 0,
      bracket_type: 'ganadores',
      player1_id: 1,
      player2_id: 2,
      winner_id: null,
      next_match_id: null,
      status: 'En curso',
      score_player1: null,
      score_player2: null,
      score_detail: null,
      scheduled_datetime: null,
      result: null,
    },
  ],
};

test('large bracket supports zoom, pan and reset interactions', async ({ page }) => {
  await bootstrapAuthenticatedSession(page, { id: 5, username: 'viewer', role: 'JUGADOR' });

  await page.route(/\/(mock-api|api)?\/?tournaments\/222$/, async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.continue();
      return;
    }
    await fulfillJson(route, tournament);
  });

  await page.route(/\/(mock-api|api)?\/?tournaments\/222\/bracket$/, async (route) => {
    await fulfillJson(route, matches);
  });

  await page.route(/\/(mock-api|api)?\/?players\/1$/, async (route) => {
    await fulfillJson(route, {
      id: 1,
      username: 'Alpha',
      email: 'a@test.com',
      role: 'JUGADOR',
      last_access_date: '2026-07-05',
      global_elo: 1200,
      avatar_url: null,
    });
  });

  await page.route(/\/(mock-api|api)?\/?players\/2$/, async (route) => {
    await fulfillJson(route, {
      id: 2,
      username: 'Beta',
      email: 'b@test.com',
      role: 'JUGADOR',
      last_access_date: '2026-07-05',
      global_elo: 1180,
      avatar_url: null,
    });
  });

  await page.route(/\/(mock-api|api)?\/?players\/99$/, async (route) => {
    await fulfillJson(route, {
      id: 99,
      username: 'Organizador',
      email: 'org@test.com',
      role: 'ADMIN',
      last_access_date: '2026-07-05',
      global_elo: 1400,
      avatar_url: null,
    });
  });

  await page.route(/\/(mock-api|api)?\/?players\/5\/tournaments$/, async (route) => {
    await fulfillJson(route, []);
  });

  await page.goto('/tournaments/222');

  await expect(page.getByRole('button', { name: 'Restablecer vista' })).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();

  await page.getByRole('button', { name: '+' }).click();
  await expect(page.getByText('120%')).toBeVisible();

  const canvas = page.locator('.bracket-canvas');
  const viewport = page.locator('.bracket-viewport');
  const initialTransform = await canvas.evaluate((element) => getComputedStyle(element).transform);
  await viewport.hover();
  await page.mouse.down();
  await page.mouse.move(220, 180);
  await page.mouse.up();
  const movedTransform = await canvas.evaluate((element) => getComputedStyle(element).transform);
  expect(movedTransform).not.toBe(initialTransform);

  await page.getByRole('button', { name: 'Restablecer vista' }).click();
  await expect(page.getByText('100%')).toBeVisible();
});
