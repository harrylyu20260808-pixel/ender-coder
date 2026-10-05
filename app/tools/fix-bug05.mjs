import { readFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const name = 'bug-05.png';
const bytes = await readFile(path.join('incoming-assets', name));
const suffix = '\0v2.2-lean-1\0win32\0auto\0illustration';
const key = createHash('sha256').update(bytes).update(suffix).digest('hex').slice(0, 24);
const target = path.join('.build', 'semantic-cutouts', key, name);
await mkdir(path.dirname(target), { recursive: true });
const tmp = path.join(os.tmpdir(), 'bug05_fix.png');
const RD = 'C:\\Users\\Harry\\AppData\\Local\\Temp\\doubao-pet-rembg-yDBKrm';
const r = spawnSync(path.join(RD, 'venv', 'Scripts', 'rembg.exe'),
  ['i', '-m', 'isnet-anime', path.join('incoming-assets', name), tmp],
  { env: { ...process.env, U2NET_HOME: path.join(RD, 'models') }, stdio: 'inherit' });
if (r.status !== 0) throw new Error('rembg failed ' + r.status);
await copyFile(tmp, target);
await rm(tmp, { force: true });
console.log('bug-05 reseeded ->', target);
