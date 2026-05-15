const spool = require('../../lib/spool.js');

module.exports = {
  name: 'code-search',
  description: 'Code search via rs-codeinsight',
  async execute(context) {
    const query = context.query || context.text || '';
    if (!query) return { ok: false, error: 'No query provided' };
    try {
      const result = await spool.execCodesearch(query, { 
        timeoutMs: context.timeoutMs || 30000,
        sessionId: context.sessionId 
      });
      return result;
    } catch (e) {
      return { ok: false, error: e.message, stderr: e.stack };
    }
  }
};
