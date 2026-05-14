async function prepare(options = {}) {
  const sessionId = options.sessionId || process.env.CLAUDE_SESSION_ID || 'default';
  const cwd = options.cwd || process.cwd();

  return {
    sessionId,
    cwd,
    initialized: true
  };
}

module.exports = {
  prepare
};
