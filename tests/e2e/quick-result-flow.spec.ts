import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedSession, fulfillJson } from './helpers';

const baseTournament = {
  id: 333,
  name: 'Final Arena',
  elimination_type: 'Round Robin',
  rounds: 1,
  status: 'En curso',
  creator_id: 1,
  creator_name: 'admin',
  total_participants: 2,
  uses_score: false,
};

test('creator can register a winner from the tournament detail flow', async ({ page }) => {
  await page.addInitScript(() => {
    (window as typeof window & { __e2eClickCount?: number }).__e2eClickCount = 0;
    document.addEventListener('click', (event) => {
      if (event.isTrusted) {
        const state = window as typeof window & { __e2eClickCount?: number };
        state.__e2eClickCount = (state.__e2eClickCount ?? 0) + 1;
      }
    }, true);
  });

  await bootstrapAuthenticatedSession(page, { id: 1, username: 'admin', role: 'ADMIN' });

  let savedPayload: unknown = null;
  let resultSaved = false;

  await page.route(/\/(mock-api|api)?\/?tournaments\/333$/, async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.continue();
      return;
    }
    await fulfillJson(route, baseTournament);
  });

  await page.route(/\/(mock-api|api)?\/?tournaments\/333\/bracket$/, async (route) => {
    await fulfillJson(route, {
      tournament_id: 333,
      tournament_status: 'En curso',
      matches: [
        {
          id: 501,
          tournament_id: 333,
          round: 1,
          position: 0,
          bracket_type: 'ganadores',
          player1_id: 1,
          player2_id: 2,
          winner_id: resultSaved ? 2 : null,
          next_match_id: null,
          status: resultSaved ? 'Finalizado' : 'En curso',
          score_player1: null,
          score_player2: null,
          score_detail: resultSaved ? 'winner_id=2' : null,
          scheduled_datetime: null,
          result: resultSaved ? 'Ganador: jugador 2' : null,
        },
      ],
    });
  });

  await page.route(/\/(mock-api|api)?\/?tournaments\/333\/matches\/501\/result$/, async (route) => {
    savedPayload = route.request().postDataJSON();
    resultSaved = true;
    await fulfillJson(route, {
      match: { id: 501 },
      winner_new_elo: 1216,
      loser_new_elo: 1184,
      tournament_finished: true,
    });
  });

  for (const [id, username, elo] of [[1, 'Admin Player', 1200], [2, 'Rival Player', 1180]] as const) {
    await page.route(new RegExp(`/(mock-api|api)?/?players/${id}$`), async (route) => {
      await fulfillJson(route, {
        id,
        username,
        email: `${username}@test.com`,
        role: 'JUGADOR',
        last_access_date: '2026-07-05',
        global_elo: elo,
        avatar_url: null,
      });
    });
  }

  await page.route(/\/(mock-api|api)?\/?players\/1\/tournaments$/, async (route) => {
    await fulfillJson(route, [{
      id: 333,
      name: 'Final Arena',
      elimination_type: 'Eliminación Sencilla',
      rounds: 1,
      status: 'En curso',
      is_creator: true,
      registration_status: 'Confirmado',
    }]);
  });

  await page.goto('/tournaments/333');

  await expect(page.getByText('Partido #501')).toBeVisible();
  await page.getByText('Partido #501').click();

  await expect(page.getByRole('heading', { name: 'Registrar ganador del encuentro' })).toBeVisible();
  await page.getByRole('button', { name: /Rival Player/i }).click();
  await page.getByRole('button', { name: 'Confirmar resultado' }).click();

  expect(savedPayload).toEqual({ winner_id: 2 });
  await expect(page.getByText('WIN')).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('LOSE')).toBeVisible({ timeout: 3000 });

  const clickCount = await page.evaluate(() => {
    const state = window as typeof window & { __e2eClickCount?: number };
    return state.__e2eClickCount ?? 0;
  });
  expect(clickCount).toBeLessThanOrEqual(3);
});
