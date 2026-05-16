const DaemonBootstrap = require('./daemon-bootstrap');

class SkillBootstrap {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.bootstrap = new DaemonBootstrap();
  }

  async checkState() {
    return this.bootstrap.checkState();
  }

  async waitForDaemon(timeoutMs = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const state = await this.checkState();
      if (state && state.acptoapi) {
        return { ok: true };
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return { ok: false, error: 'Daemon startup timeout' };
  }

  getAcptoApiSocket() {
    return this.bootstrap.getAcptoApiSocket();
  }

  getLearnSocket() {
    return this.bootstrap.getLearnSocket();
  }

  getCodeinsightSocket() {
    return this.bootstrap.getCodeinsightSocket();
  }
}

module.exports = SkillBootstrap;
