#!/usr/bin/env tsx
// Launch NanoClaw with the TUI channel enabled.
// Stops the background service first, restarts it on exit.
import { execSync } from 'child_process';

function serviceIsActive(): boolean {
  try {
    execSync('systemctl --user is-active nanoclaw', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const wasRunning = serviceIsActive();
if (wasRunning) {
  execSync('systemctl --user stop nanoclaw', { stdio: 'inherit' });
}

process.on('exit', () => {
  if (wasRunning) {
    try {
      execSync('systemctl --user start nanoclaw', { stdio: 'inherit' });
    } catch {
      // Best effort — don't crash on exit
    }
  }
});

process.env.TUI_ENABLED = 'true';
const { main } = await import('../src/index.js');
await main();
