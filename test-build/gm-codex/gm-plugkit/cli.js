#!/usr/bin/env node
'use strict';

const { ensureReady, startSpoolDaemon, getBinaryPath, isReady } = require('./bootstrap');

const usage = `gm-plugkit — Bootstrap and daemon-spawn for gm plugkit binary.

Usage:
  bun x gm-plugkit@latest          Bootstrap + start spool daemon
  bun x gm-plugkit@latest --daemon  Same as default
  bun x gm-plugkit@latest --binary  Print binary path only
  bun x gm-plugkit@latest --status  JSON status check
  bun x gm-plugkit@latest --help    Show this help
`;

(async () => {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage);
    process.exit(0);
  }

  try {
    const result = await ensureReady();
    if (!result.ok) {
      console.error('Bootstrap failed:', result.error);
      process.exit(1);
    }

    const daemon = startSpoolDaemon();
    if (!daemon.ok) {
      console.error('Daemon start failed:', daemon.error);
      process.exit(1);
    }

    console.log(JSON.stringify({
      ok: true,
      binary: result.binaryPath,
      daemon: daemon,
      message: 'plugkit ready, spool watcher running'
    }));
    process.exit(0);
  } catch (err) {
    console.error('gm-plugkit failed:', err.message);
    process.exit(1);
  }
})();
