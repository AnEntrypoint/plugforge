const spool = require('../../lib/spool.js');

module.exports = {
  name: 'create-lang-plugin',
  description: 'Create language/CLI plugins for gm-cc',
  async execute(context) {
    if (!context.toolId) return { ok: false, error: 'No toolId provided' };
    try {
      const result = await spool.execNodejs(context.command || '', {
        timeoutMs: context.timeoutMs || 60000,
        sessionId: context.sessionId
      });
      return result;
    } catch (e) {
      return { ok: false, error: e.message, stderr: e.stack };
    }
  }
};
