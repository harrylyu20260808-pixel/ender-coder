// Move already-produced flat cutouts into the template semantic-cache locations.
import { readFile, mkdir, access, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

const spec = JSON.parse(await readFile('pet-spec.json', 'utf8'));
const inputDir = path.resolve('incoming-assets');
const cacheRoot = path.resolve('.build', 'semantic-cutouts');
const stagedOut = path.join(os.tmpdir(), 'ec_staged_out');
const names = new Set(spec.states.flatMap((s) => s.frames));
names.add(spec.character.coreAsset);
const suffix = '\0v2.2-lean-1\0win32\0auto\0illustration';

let moved = 0; let skipped = 0; let missing = [];
for (const name of names) {
  const bytes = await readFile(path.join(inputDir, name));
  const key = createHash('sha256').update(bytes).update(suffix).digest('hex').slice(0, 24);
  const cacheTarget = path.join(cacheRoot, key, name);
  let exists = false;
  try { await access(cacheTarget); exists = true; } catch {}
  if (exists) { skipped++; continue; }
  const produced = path.join(stagedOut, path.basename(name)); // rembg p flattens
  try {
    await access(produced);
    await mkdir(path.dirname(cacheTarget), { recursive: true });
    await cp(produced, cacheTarget);
    moved++;
  } catch { missing.push(name); }
}
console.log('moved:', moved, 'already cached:', skipped, 'missing:', missing);
