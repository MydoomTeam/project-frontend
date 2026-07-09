import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedSession, fulfillJson } from './helpers';

test('creator can generate bracket and see matches appear', async ({ page }) => {
  await bootstrapAuthenticatedSession(page, { id: 1, username: 'admin', role: 'ADMIN' });

  let bracketGenerated = false;
  let generateCalls = 0;

  await page.route(/\/(mock-api|api)?\/?tournaments\/444$/, async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.continue();
      return;
    }

    await fulfillJson(route, {
      id: 444,
      name: 'Copa Bracket',
      elimination_type: 'Eliminación Sencilla',
      rounds: 3,
      status: bracketGenerated ? 'Listo para iniciar' : 'Pendiente',
      creator_id: 1,
      creator_name: 'admin',
      total_participants: 8,
      uses_score: false,
    });
  });

  await page.route(/\/(mock-api|api)?\/?tournaments\/444\/registrations$/, async (route) => {
    await fulfillJson(route, [
      {
        id: 1,
        tournament_id: 444,
        player_id: 2,
        username: 'Alpha',
        email: 'alpha@test.com',
        status: 'Confirmado',
      },
      {
        id: 2,
        tournament_id: 444,
        player_id: 3,
        username: 'Beta',
        email: 'beta@test.com',
        status: 'Confirmado',
      },
    ]);
  });

  await page.route(/\/(mock-api|api)?\/?tournaments\/444\/bracket$/, async (route) => {
    if (route.request().method() === 'POST') {
      generateCalls += 1;
      bracketGenerated = true;
      await fulfillJson(route, {
        tournament_id: 444,
        tournament_status: 'Listo para iniciar',
        matches: [],
      }, 201);
      return;
    }

    await fulfillJson(route, {
      tournament_id: 444,
      tournament_status: 'Listo para iniciar',
      matches: [
        {
          id: 601,
          tournament_id: 444,
          round: 1,
          position: 0,
          bracket_type: 'ganadores',
          player1_id: 2,
          player2_id: 3,
          winner_id: null,
          next_match_id: null,
          score_player1: null,
          score_player2: null,
          score_detail: null,
          scheduled_datetime: null,
          result: null,
          status: 'Programado',
        },
      ],
    });
  });

  for (const [id, username, elo] of [[1, 'Admin', 1400], [2, 'Alpha', 1200], [3, 'Beta', 1180]] as const) {
    await page.route(new RegExp(`/(mock-api|api)?/?players/${id}$`), async (route) => {
      await fulfillJson(route, {
        id,
        username,
        email: `${username.toLowerCase()}@test.com`,
        role: id === 1 ? 'ADMIN' : 'JUGADOR',
        last_access_date: '2026-07-05',
        global_elo: elo,
        avatar_url: null,
      });
    });
  }

  await page.route(/\/(mock-api|api)?\/?players\/1\/tournaments$/, async (route) => {
    await fulfillJson(route, [{
      id: 444,
      name: 'Copa Bracket',
      elimination_type: 'Eliminación Sencilla',
      rounds: 3,
      status: bracketGenerated ? 'Listo para iniciar' : 'Pendiente',
      is_creator: true,
      registration_status: 'Confirmado',
    }]);
  });

  await page.goto('/tournaments/444');

  await expect(page.getByRole('button', { name: 'Generar cuadro' })).toBeVisible();
  const startedAt = Date.now();
  await page.getByRole('button', { name: 'Generar cuadro' }).click();

  await expect.poll(() => generateCalls).toBe(1);
  await expect(page.getByText('Partido #601')).toBeVisible();
  await expect(page.getByText('Programado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar torneo' })).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(4000);
});
