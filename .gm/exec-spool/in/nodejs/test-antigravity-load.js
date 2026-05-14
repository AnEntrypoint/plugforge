const AntigravityAdapter = require('../../platforms/antigravity');
const path = require('path');

const adapter = new AntigravityAdapter();
const sourceDir = path.join(process.cwd(), 'gm-starter');
const pluginSpec = {
  name: 'gm',
  version: '2.0.0',
  description: 'GM Test',
  author: 'test'
};

const structure = adapter.createFileStructure(pluginSpec, sourceDir);
const skillPaths = Object.keys(structure).filter(k => k.startsWith('skills/'));

console.log('Skills included in antigravity:');
skillPaths.forEach(s => console.log(`  ${s}`));
console.log(`\nTotal skills: ${skillPaths.length}`);
