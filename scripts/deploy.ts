import { spawnSync } from 'node:child_process';

const required = ['ANCHOR_PROVIDER_URL', 'ANCHOR_WALLET'] as const;
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing deployment environment: ${missing.join(', ')}`);
  process.exit(1);
}

const result = spawnSync('anchor', ['deploy', '--provider.cluster', 'devnet'], {
  cwd: new URL('../programs/cocreate/', import.meta.url),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
