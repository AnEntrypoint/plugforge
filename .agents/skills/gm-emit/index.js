const fs = require('fs');
const path = require('path');

const gmDir = path.join(process.env.GM_PROJECT_DIR || process.cwd(), '.gm');

module.exports = {
  needsGm: () => fs.existsSync(path.join(gmDir, 'prd.yml')),
  gmFiredThisTurn: () => fs.existsSync(path.join(gmDir, 'gm-fired-this-turn')),
  readMutables: () => {
    const mutsPath = path.join(gmDir, 'mutables.yml');
    if (!fs.existsSync(mutsPath)) return [];
    try {
      const yaml = require('js-yaml');
      return yaml.load(fs.readFileSync(mutsPath, 'utf8')) || [];
    } catch (e) {
      return [];
    }
  },
  hasUnresolvedMutables: function() {
    return this.readMutables().some(m => m.status === 'unknown');
  }
};
