const spool = require('../../lib/spool.js');

module.exports = {
  name: 'pages',
  description: 'GitHub Pages site scaffolding and maintenance',
  async execute(context) {
    if (!context.command) return { ok: false, error: 'No command provided' };
    try {
      const result = await spool.execNodejs(context.command, {
        timeoutMs: context.timeoutMs || 120000,
        sessionId: context.sessionId
      });
      return result;
    } catch (e) {
      return { ok: false, error: e.message, stderr: e.stack };
    }
  }
};
