const fs = require('fs');
const dir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';
if (fs.existsSync(dir)) {
  fs.readdirSync(dir).forEach(f => console.log(f));
} else {
  console.log('out dir missing');
}
