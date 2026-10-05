// Force-overwrite incoming-assets from the correct asset-source using node (no PS merge).
import { readdir, mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = 'C:/Users/Harry/Doubao/chats/2026-09-06/new-chat-1/EnderCoder';
const src = path.join(base, 'asset-source');
const dst = path.join(base, 'app', 'incoming-assets');
await rm(dst, { recursive: true, force: true });
await mkdir(dst, { recursive: true });

let n = 0; const seen = new Map();
async function walk(s, d) {
  for (const e of await readdir(s, { withFileTypes: true })) {
    const sp = path.join(s, e.name); const dp = path.join(d, e.name);
    if (e.isDirectory()) { await mkdir(dp, { recursive: true }); await walk(sp, dp); }
    else { await copyFile(sp, dp); n++; seen.set(e.name, 1); }
  }
}
await walk(src, dst);

// verify uniqueness
const g = {};
async function vwalk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) await vwalk(p);
    else {
      const { readFile } = await import('node:fs/promises');
      const h = createHash('sha256').update(await readFile(p)).digest('hex');
      (g[h] = g[h] || []).push(e.name);
    }
  }
}
await vwalk(dst);
console.log('copied', n, 'incoming unique:', Object.keys(g).length);
