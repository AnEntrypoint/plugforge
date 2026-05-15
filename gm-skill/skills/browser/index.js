const spool = require('../../lib/spool.js');

module.exports = {
  name: 'browser',
  description: 'Browser automation via exec:browser',
  async execute(context) {
    if (!context.command) return { ok: false, error: 'No command provided' };
    try {
      const body = context.command;
      const result = await spool.execSpool(body, 'browser', {
        timeoutMs: context.timeoutMs || 60000,
        sessionId: context.sessionId
      });
      return result;
    } catch (e) {
      return { ok: false, error: e.message, stderr: e.stack };
    }
  }
};
