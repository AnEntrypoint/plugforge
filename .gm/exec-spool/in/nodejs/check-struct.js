const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(process.cwd(), 'gm-starter', 'skills'),
  path.join(process.cwd(), 'gm-starter', 'agents'),
];

dirs.forEach(dir => {
  console.log(`\n=== ${dir} ===`);
  if (fs.existsSync(dir)) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.forEach(item => {
      if (item.isDirectory()) console.log(`  [DIR] ${item.name}`);
      else console.log(`  [FILE] ${item.name}`);
    });
  } else {
    console.log('  NOT FOUND');
  }
});
