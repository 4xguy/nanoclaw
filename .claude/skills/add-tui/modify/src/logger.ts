import path from 'path';

import pino from 'pino';

// When TUI is active, suppress all stdout/stderr output so the terminal UI
// stays clean. All logs go to file only. Check process.env directly here
// (not via config.ts) to avoid a circular import — config imports env.ts
// which is fine, but logger is imported by almost everything so we keep it
// dependency-free.
const TUI_ENABLED = process.env.TUI_ENABLED === 'true';

const LOG_FILE = path.resolve(process.cwd(), 'logs', 'nanoclaw.log');

export const logger = TUI_ENABLED
  ? pino(
      { level: process.env.LOG_LEVEL || 'info' },
      pino.destination({ dest: LOG_FILE, sync: false }),
    )
  : pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: { target: 'pino-pretty', options: { colorize: true } },
    });

// When TUI is active, redirect console.log/warn/error to the file logger
// so libraries that bypass pino (e.g. baileys Signal protocol dumps) don't
// pollute the terminal UI.
if (TUI_ENABLED) {
  console.log = (...args: unknown[]) => logger.debug(args.map(String).join(' '));
  console.info = (...args: unknown[]) => logger.debug(args.map(String).join(' '));
  console.warn = (...args: unknown[]) => logger.warn(args.map(String).join(' '));
  console.error = (...args: unknown[]) => logger.error(args.map(String).join(' '));
}

// Route uncaught errors through pino so they get timestamps in stderr
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
});
