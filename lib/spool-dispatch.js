const fs = require('fs');
const path = require('path');

class SpoolDispatcher {
  constructor(gmDir = '.gm') {
    this.gmDir = gmDir;
    this.prdPath = path.join(gmDir, 'prd.yml');
    this.mutablesPath = path.join(gmDir, 'mutables.yml');
    this.needsGmPath = path.join(gmDir, 'needs-gm');
  }

  checkPrdExists() {
    return fs.existsSync(this.prdPath);
  }

  checkUnresolvedMutables() {
    if (!fs.existsSync(this.mutablesPath)) {
      return null;
    }

    const content = fs.readFileSync(this.mutablesPath, 'utf8');
    const unresolvedIds = [];

    const lines = content.split('\n');
    let currentId = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.match(/^\s*-\s+id:\s*(.+)/)) {
        const match = line.match(/^\s*-\s+id:\s*(.+)/);
        currentId = match[1].trim();
      }

      if (line.match(/^\s*status:\s*unknown/) && currentId) {
        unresolvedIds.push(currentId);
      }
    }

    return unresolvedIds.length > 0 ? unresolvedIds : null;
  }

  checkGmFired(sessionId) {
    const markerPath = path.join(this.gmDir, `gm-fired-${sessionId}`);
    return fs.existsSync(markerPath);
  }

  checkNeedsGm() {
    return fs.existsSync(this.needsGmPath);
  }

  setNeedsGm() {
    fs.writeFileSync(this.needsGmPath, '');
  }

  clearNeedsGm() {
    if (fs.existsSync(this.needsGmPath)) {
      fs.unlinkSync(this.needsGmPath);
    }
  }

  setGmFired(sessionId) {
    const markerPath = path.join(this.gmDir, `gm-fired-${sessionId}`);
    fs.writeFileSync(markerPath, '');
  }

  clearGmFired(sessionId) {
    const markerPath = path.join(this.gmDir, `gm-fired-${sessionId}`);
    if (fs.existsSync(markerPath)) {
      fs.unlinkSync(markerPath);
    }
  }

  canDispatchToolUse(sessionId) {
    const needsGm = this.checkNeedsGm();
    if (!needsGm) {
      return { allowed: true };
    }

    const gmFired = this.checkGmFired(sessionId);
    if (!gmFired) {
      return {
        allowed: false,
        reason: 'PRD exists but gm skill has not run this turn. Execute Skill(gm:gm) or Agent(subagent_type="gm:gm") first.'
      };
    }

    return { allowed: true };
  }

  canExecuteWrite(sessionId) {
    const unresolvedMutables = this.checkUnresolvedMutables();
    if (unresolvedMutables) {
      return {
        allowed: false,
        reason: `Cannot write/edit while mutables are unresolved: ${unresolvedMutables.join(', ')}. Resolve all unknowns in .gm/mutables.yml first.`
      };
    }

    return { allowed: true };
  }

  canExecuteGit(sessionId) {
    const unresolvedMutables = this.checkUnresolvedMutables();
    if (unresolvedMutables) {
      return {
        allowed: false,
        reason: `Cannot commit/push while mutables are unresolved: ${unresolvedMutables.join(', ')}. Resolve all unknowns in .gm/mutables.yml first.`
      };
    }

    return { allowed: true };
  }

  checkDispatchGates(sessionId, operation) {
    switch (operation) {
      case 'tool-use':
        return this.canDispatchToolUse(sessionId);
      case 'write':
      case 'edit':
        return this.canExecuteWrite(sessionId);
      case 'git-commit':
      case 'git-push':
        return this.canExecuteGit(sessionId);
      default:
        return { allowed: true };
    }
  }

  getPrdStatus() {
    if (!this.checkPrdExists()) {
      return { empty: true, items: [] };
    }

    const content = fs.readFileSync(this.prdPath, 'utf8');
    const items = [];
    let currentItem = null;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.match(/^\s*-\s+id:/)) {
        if (currentItem) items.push(currentItem);
        currentItem = {};
      }

      if (currentItem) {
        if (line.match(/^\s*id:\s*(.+)/)) {
          currentItem.id = line.match(/^\s*id:\s*(.+)/)[1].trim();
        }
        if (line.match(/^\s*status:\s*(.+)/)) {
          currentItem.status = line.match(/^\s*status:\s*(.+)/)[1].trim();
        }
        if (line.match(/^\s*subject:\s*(.+)/)) {
          currentItem.subject = line.match(/^\s*subject:\s*(.+)/)[1].trim();
        }
      }
    }

    if (currentItem && currentItem.id) {
      items.push(currentItem);
    }

    return { empty: items.length === 0, items };
  }

  getMutablesStatus() {
    if (!fs.existsSync(this.mutablesPath)) {
      return { empty: true, items: [] };
    }

    const content = fs.readFileSync(this.mutablesPath, 'utf8');
    const items = [];
    let currentItem = null;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.match(/^\s*-\s+id:/)) {
        if (currentItem) items.push(currentItem);
        currentItem = {};
      }

      if (currentItem) {
        if (line.match(/^\s*id:\s*(.+)/)) {
          currentItem.id = line.match(/^\s*id:\s*(.+)/)[1].trim();
        }
        if (line.match(/^\s*status:\s*(.+)/)) {
          currentItem.status = line.match(/^\s*status:\s*(.+)/)[1].trim();
        }
        if (line.match(/^\s*claim:\s*(.+)/)) {
          currentItem.claim = line.match(/^\s*claim:\s*(.+)/)[1].trim();
        }
      }
    }

    if (currentItem && currentItem.id) {
      items.push(currentItem);
    }

    return { empty: items.length === 0, items };
  }
}

module.exports = SpoolDispatcher;
