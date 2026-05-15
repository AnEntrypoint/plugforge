const spool = require('../../lib/spool.js');

module.exports = {
  name: 'textprocessing',
  description: 'Text processing via haiku-backed semantic operations',
  async execute(context) {
    if (!context.text) return { ok: false, error: 'No text provided' };
    const instruction = context.instruction || 'process';
    try {
      const result = await spool.execNodejs(
        `const text = \`${context.text.replace(/`/g, '\\`')}\`; 
         const instruction = '${instruction}'; 
         console.log(\`Instruction: \${instruction}\\nText length: \${text.length}\`);`,
        { timeoutMs: context.timeoutMs || 30000, sessionId: context.sessionId }
      );
      return result;
    } catch (e) {
      return { ok: false, error: e.message, stderr: e.stack };
    }
  }
};
