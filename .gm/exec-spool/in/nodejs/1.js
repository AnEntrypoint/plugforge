const fs = require('fs');
const path = require('path');

// Compare gm-plugkit/bootstrap.js vs gm-starter/bin/bootstrap.js
const gmPlugkit = fs.readFileSync('C:/dev/gm/gm-starter/gm-plugkit/bootstrap.js', 'utf8');
const gmStarter = fs.readFileSync('C:/dev/gm/gm-starter/bin/bootstrap.js', 'utf8');

const gmPlugkitFunctions = (gmPlugkit.match(/function \w+/g) || []).sort();
const gmStarterFunctions = (gmStarter.match(/function \w+/g) || []).sort();

console.log('=== gm-plugkit functions ===');
console.log(gmPlugkitFunctions.join('\n'));
console.log('\n=== gm-starter/bin functions ===');
console.log(gmStarterFunctions.join('\n'));

const missing = gmStarterFunctions.filter(f => !gmPlugkitFunctions.includes(f));
console.log('\n=== Missing from gm-plugkit ===');
console.log(missing.join('\n'));
