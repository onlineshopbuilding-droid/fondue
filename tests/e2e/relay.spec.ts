import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { gameState, waitFor, waitForGame } from './helpers';

let server: ChildProcess;
const PORT = 8799;

test.beforeAll(async () => {
  server = spawn(process.execPath, ['server/relay/index.mjs', String(PORT)], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
});
test.afterAll(() => { server.kill(); });

test('plan B relay carries a co-op game', async ({ browser }) => {
  const context = await browser.newContext();
  const host = await context.newPage();
  const guest = await context.newPage();
  const q = `?relay=ws://localhost:${PORT}`;
  await host.goto(`/${q}`);
  await waitForGame(host);
  await host.click('button[data-a="play"]');
  await host.fill('#name', 'Tim');
  await host.click('button[data-a="openRoom"]');
  await waitFor(() => host.locator('#status').innerText(), (t) => t.includes('Waiting'), 10000);
  const code = await host.locator('#roomCode').innerText();
  await guest.goto(`/${q}&join=${code}`);
  await waitForGame(guest);
  await guest.fill('#name', 'Lenny');
  await guest.click('button[data-a="doJoin"]');
  await expect(host.locator('#startCoop')).toBeEnabled({ timeout: 10000 });
  await host.click('#startCoop');
  await waitFor(() => gameState(guest), (s) => s?.phase === 'battle', 15000);
  await guest.mouse.move(600, 280);
  await waitFor(() => gameState(host), (s) => Math.abs(s!.hands[1].x - 600) < 5, 5000);
  expect((await gameState(guest))!.connection).toBe('connected');
  await context.close();
});
