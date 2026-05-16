const hr = require('./lib/hook-replacer.js');
console.log('hook-replacer functions:', Object.keys(hr));
console.log('spoolDir:', hr.getSpoolDir());
console.log('bin:', hr.getToolsBin());
console.log('bin exists:', require('fs').existsSync(hr.getToolsBin()));