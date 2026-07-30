const { execFileSync } = require('node:child_process');
const path = require('node:path');

const args = process.argv.slice(2);
const env = {
  ...process.env,
  WRANGLER_LOG_PATH: '.wrangler/wrangler.log',
};

const binary = path.join(
  'C:\\Users\\bradl\\Documents\\Codex\\2026-07-24\\i-want-to-build-a-bible',
  'node_modules',
  'vinext',
  'dist',
  'cli.js'
);

execFileSync(process.execPath, [binary, ...args], {
  env,
  stdio: 'inherit',
});
