import { createHash } from 'node:crypto';
import { access, mkdir, readdir, readFile, rm, stat, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = {};
for (let index = 2; index < process.argv.length; index += 2) args[process.argv[index].replace(/^--/, '')] = process.argv[index + 1];
const mode = args.mode;
const platform = args.platform;
const arch = args.arch;
const outDir = path.resolve(args.out ?? path.join(process.cwd(), 'out'));
if (!['package', 'make'].includes(mode)) throw new Error(`Unknown collect mode: ${mode}`);

const root = process.cwd();
const spec = JSON.parse(await readFile(path.join(root, 'pet-spec.json'), 'utf8'));
const appName = spec.app.name;
const version = spec.app.version;
const releaseDir = path.join(root, 'release');
await mkdir(releaseDir, { recursive: true });

const packageDirName = `${appName}-${platform}-${arch}`;
const packageDir = path.join(outDir, packageDirName);
let packageStat;
try { packageStat = await stat(packageDir); } catch { throw new Error(`Packaged app directory missing: ${packageDir}`); }
if (!packageStat.isDirectory()) throw new Error(`Packaged app is not a directory: ${packageDir}`);

const entries = [];
let sizeBytes = 0;
async function walk(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      const real = await readFile(full);
      const resolved = path.resolve(path.dirname(full), real.toString());
      if (!resolved.startsWith(path.resolve(packageDir))) throw new Error(`Absolute or escaping symlink in package: ${relative}`);
      entries.push({ type: 'symlink', path: relative, target: real.toString() });
    } else if (entry.isDirectory()) {
      await walk(full, relative);
    } else {
      const info = await stat(full);
      sizeBytes += info.size;
      entries.push({ type: 'file', path: relative, size: info.size, sha256: createHash('sha256').update(await readFile(full)).digest('hex') });
    }
  }
}
await walk(packageDir);

let installer;
if (mode === 'make') {
  const candidates = (await readdir(outDir)).filter((name) => /setup\.exe$/i.test(name) || /\.zip$/i.test(name) || /\.dmg$/i.test(name));
  if (candidates.length !== 1) throw new Error(`Expected exactly one installer artifact, found: ${candidates.join(', ')}`);
  const artifact = path.join(outDir, candidates[0]);
  const info = await stat(artifact);
  installer = {
    file: candidates[0],
    size: info.size,
    sha256: createHash('sha256').update(await readFile(artifact)).digest('hex'),
  };
}

const target = path.join(releaseDir, mode === 'package' ? 'app' : 'installer');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const entry of entries) {
  if (entry.type === 'symlink') {
    // preserve relative symlinks only
    const dest = path.join(target, entry.path);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, entry.target);
  } else {
    await copyFile(path.join(packageDir, entry.path), path.join(target, entry.path));
  }
}
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode,
  platform,
  arch,
  appName,
  version,
  packageDir: `${appName}-${platform}-${arch}`,
  sizeBytes,
  entries: entries.length,
  ...(installer ? { installer } : {}),
};
await writeFile(path.join(releaseDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Collected ${mode} artifact for ${platform}/${arch}: ${target}`);
