const spool = require('../../lib/spool.js');

module.exports = {
  name: 'ssh',
  description: 'SSH command execution on remote hosts',
  async execute(context) {
    if (!context.command) return { ok: false, error: 'No command provided' };
    try {
      const result = await spool.execBash(context.command, {
        timeoutMs: context.timeoutMs || 60000,
        sessionId: context.sessionId
      });
      return result;
    } catch (e) {
      return { ok: false, error: e.message, stderr: e.stack };
    }
  }
};
