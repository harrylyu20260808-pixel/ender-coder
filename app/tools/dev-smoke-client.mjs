import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

const args = {};
for (let index = 2; index < process.argv.length; index += 2) args[process.argv[index].replace(/^--/, '')] = process.argv[index + 1];
const port = Number(args.port);
if (!Number.isInteger(port)) throw new Error('--port is required');

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
  });
}

function waitForTarget(timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      http.get(`http://127.0.0.1:${port}/json`, (response) => {
        response.resume();
        response.on('end', () => resolve());
      }).on('error', () => {
        if (Date.now() > deadline) reject(new Error(`DevTools target did not open within ${Math.round(timeoutMs / 1000)}s`));
        else setTimeout(attempt, 500);
      });
    };
    attempt();
  });
}

async function main() {
  await waitForTarget();
  const targets = await getJson(`http://127.0.0.1:${port}/json`);
  const pages = targets.filter((target) => target.type === 'page');
  if (pages.length < 3) throw new Error(`Expected three renderer pages, found ${pages.length}`);

  for (const page of pages) {
    const socket = await new Promise((resolve, reject) => {
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      ws.onopen = () => resolve(ws);
      ws.onerror = reject;
    });
    const evaluate = (expression) => new Promise((resolve) => {
      const id = Math.floor(Math.random() * 1e9);
      const listener = (event) => {
        const message = JSON.parse(event.data);
        if (message.id === id) { socket.removeEventListener('message', listener); resolve(message.result?.result?.value); }
      };
      socket.addEventListener('message', listener);
      socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
    });
    const expression = `(async () => {
      const api = window.petAPI;
      if (!api) return { ok: false, error: 'no petAPI' };
      try {
        const settings = await api.settings.get();
        const interactions = await api.interactions.list();
        return { ok: true, settings: !!settings, interactions: Array.isArray(interactions) };
      } catch (error) { return { ok: false, error: String(error) }; }
    })()`;
    const result = await evaluate(expression);
    socket.close();
    if (!result?.ok) throw new Error(`Smoke IPC failed in ${page.url}: ${JSON.stringify(result)}`);
  }

  console.log('DEV_SMOKE_IPC_ALL_PAGES ok');
}

main().catch((error) => { console.error(error); process.exit(1); });
