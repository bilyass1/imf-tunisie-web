import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://127.0.0.1:3100/fr';

async function ready() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    await response.body?.cancel();
    return response.ok;
  } catch { return false; }
}

async function openPreview() {
  if (!await ready()) {
    const candidates = fs.readdirSync(root, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && /^\.next(?:-|$)/.test(entry.name))
      .map(entry => ({ directory: entry.name, build: path.join(root, entry.name, 'BUILD_ID') }))
      .filter(entry => fs.existsSync(entry.build))
      .sort((a, b) => fs.statSync(b.build).mtimeMs - fs.statSync(a.build).mtimeMs);
    const build = candidates[0];
    if (!build) throw new Error('Aucune version compilée. Lancez npm run build, puis réessayez.');

    const stdout = fs.openSync(path.join(root, build.directory, 'preview.stdout.log'), 'a');
    const stderr = fs.openSync(path.join(root, build.directory, 'preview.stderr.log'), 'a');
    const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3100'], {
      cwd: root, env: { ...process.env, IMF_BUILD_DIR: build.directory },
      detached: true, windowsHide: true, stdio: ['ignore', stdout, stderr],
    });
    let launchError;
    server.on('error', error => { launchError = error; });
    server.unref();
    fs.closeSync(stdout); fs.closeSync(stderr);

    const deadline = Date.now() + 25000;
    while (!await ready()) {
      if (launchError) throw launchError;
      if (Date.now() > deadline) throw new Error(`Le site ne répond pas. Consultez ${build.directory}/preview.stderr.log.`);
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
  console.log(`Site prêt : ${url}`);
  // --check verifies startup without opening another browser window.
  if (process.argv.includes('--check')) return;
  const command = process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/d', '/c', 'start', '', url] : [url];
  const browser = spawn(command, args, { detached: true, windowsHide: true, stdio: 'ignore' });
  browser.on('error', () => console.log(`Ouvrez ce lien dans votre navigateur : ${url}`));
  browser.unref();
}

openPreview().catch(error => { console.error(error.message); process.exitCode = 1; });
