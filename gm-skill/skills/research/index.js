const spool = require('../../lib/spool.js');

module.exports = {
  name: 'research',
  description: 'Web research via parallel subagent fan-out',
  async execute(context) {
    if (!context.query) return { ok: false, error: 'No query provided' };
    try {
      const result = await spool.execNodejs(
        `console.log('Research query: ${context.query}');`,
        { timeoutMs: context.timeoutMs || 120000, sessionId: context.sessionId }
      );
      return result;
    } catch (e) {
      return { ok: false, error: e.message, stderr: e.stack };
    }
  }
};
