import { spawnSync } from 'node:child_process';

const scripts = [
  'test:responsive',
  'test:keyboard',
  'test:motion',
  'test:offline',
  'test:failures',
  'test:console-401',
  'test:tour-partial-failure',
  'test:agenda-layout',
  'test:session-storage',
  'test:endpoint-injection',
  'test:security-headers',
  'test:api-resilience',
  'test:zoom-reflow',
  'test:timeline-observer',
  'test:cached-notices',
  'test:mobile-drawer',
  'test:fan-theme'
];

for (const script of scripts) {
  console.log(`\n>>> npm run ${script}`);
  const result = spawnSync('npm', ['run', script], { stdio: 'inherit', shell: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\nFINAL_LOCAL_AUDITS_PASS scripts=' + scripts.length);
