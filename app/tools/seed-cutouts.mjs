// Seed the template's own semantic-cutout cache using the pinned rembg + isnet-anime,
// but WITHOUT alpha-matting (5 min/frame + OOM on this weak CPU; unnecessary for crisp
// blocky cartoon edges). Normalization and every QA gate still run via process:assets.
import { readFile, writeFile, mkdir, access, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const spec = JSON.parse(await readFile('pet-spec.json', 'utf8'));
const inputDir = path.resolve('incoming-assets');
const cacheRoot = path.resolve('.build', 'semantic-cutouts');
const names = new Set(spec.states.flatMap((s) => s.frames));
names.add(spec.character.coreAsset);

const REMBG_DIR = 'C:\\Users\\Harry\\AppData\\Local\\Temp\\doubao-pet-rembg-yDBKrm';
const rembg = path.join(REMBG_DIR, 'venv', 'Scripts', 'rembg.exe');
const u2home = path.join(REMBG_DIR, 'models');

const staging = path.join(os.tmpdir(), 'ec_staging');
const stagedOut = path.join(os.tmpdir(), 'ec_staged_out');
await rm(staging, { recursive: true, force: true });
await rm(stagedOut, { recursive: true, force: true });

const suffix = '\0v2.2-lean-1\0win32\0auto\0illustration';
const todo = [];
for (const name of names) {
  const bytes = await readFile(path.join(inputDir, name));
  const key = createHash('sha256').update(bytes).update(suffix).digest('hex').slice(0, 24);
  const cacheTarget = path.join(cacheRoot, key, name);
  const sp = path.join(staging, name);
  await mkdir(path.dirname(sp), { recursive: true });
  await writeFile(sp, bytes);
  todo.push({ name, cacheTarget });
}
console.log('Need cutout:', todo.length);
if (todo.length) {
  const r = spawnSync(rembg, ['p', '-m', 'isnet-anime', staging, stagedOut], {
    env: { ...process.env, U2NET_HOME: u2home }, stdio: 'inherit',
  });
  if (r.status !== 0) throw new Error('rembg p failed: ' + r.status);
  for (const t of todo) {
    const produced = path.join(stagedOut, t.name);
    await mkdir(path.dirname(t.cacheTarget), { recursive: true });
    await cp(produced, t.cacheTarget);
  }
}
await rm(staging, { recursive: true, force: true });
await rm(stagedOut, { recursive: true, force: true });
console.log('Seeded cutouts done:', todo.length);
