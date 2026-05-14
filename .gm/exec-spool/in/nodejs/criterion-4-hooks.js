const fs = require('fs');
const path = require('path');

const hooksPath = path.join(process.cwd(), 'build', 'gm-gc', 'hooks', 'hooks.json');
const hooksText = fs.readFileSync(hooksPath, 'utf8');
const hooks = JSON.parse(hooksText);

console.log(`CRITERION 4: hooks.json configured for Gemini`);
console.log(`Hook types found:`);

const hookNames = Object.keys(hooks || {});
hookNames.forEach(h => console.log(`  - ${h}`));

const requiredHooks = ['BeforeTool', 'SessionStart', 'BeforeAgent', 'SessionEnd'];
const hasHooks = requiredHooks.every(h => hookNames.includes(h));

console.log(`\nRequired hooks (Gemini format):`);
requiredHooks.forEach(h => {
  const present = hookNames.includes(h) ? 'PRESENT' : 'MISSING';
  console.log(`  ${h}: ${present}`);
});

console.log(`\nCRITERION 4 PASS: ${hasHooks}`);
