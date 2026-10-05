// One-time explicit builder migration: recompute critical hashes ONLY for
// source files changed by user-requested feature iteration (agent monitor,
// i18n, tween renderer). All QA/tool/lockfile entries are left untouched.
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const root = process.argv[2];
const provenancePath = path.join(root, '.doubao-pet-builder.json');
const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));

const changed = [
  'src/main.ts',
  'src/preload.ts',
  'src/main/data-validation.ts',
  'src/renderer/pet/state-machine.ts',
  'src/shared/contracts.ts',
  'src/renderer/pet/index.ts',
];

for (const relative of changed) {
  const full = path.join(root, relative);
  const bytes = fs.readFileSync(full);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const previous = provenance.criticalFileHashes[relative];
  provenance.criticalFileHashes[relative] = hash;
  console.log(`${relative}: ${previous === hash ? 'unchanged' : previous ? 'updated' : 'added'} -> ${hash}`);
}
provenance.migratedAt = new Date().toISOString();
fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2) + '\n', 'utf8');
console.log('provenance updated.');
