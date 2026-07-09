import { Page, Route } from '@playwright/test';

export const bootstrapAuthenticatedSession = async (
  page: Page,
  user: { id: number; username: string; role?: string } = { id: 1, username: 'admin' },
  options: { accelerateIntervals?: boolean } = {},
): Promise<void> => {
  await page.addInitScript(({ sessionUser, accelerateIntervals }) => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('user_profile', JSON.stringify({
      id: sessionUser.id,
      username: sessionUser.username,
      role: sessionUser.role ?? 'ADMIN',
      registered_tournaments: [],
    }));

    if (accelerateIntervals) {
      const originalSetInterval = window.setInterval.bind(window);
      window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        const delay = typeof timeout === 'number' ? timeout : 0;
        return originalSetInterval(handler, Math.min(delay, 50), ...args);
      }) as typeof window.setInterval;
    }
  }, { sessionUser: user, accelerateIntervals: options.accelerateIntervals ?? false });
};

export const fulfillJson = async (route: Route, body: unknown, status = 200): Promise<void> => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};
