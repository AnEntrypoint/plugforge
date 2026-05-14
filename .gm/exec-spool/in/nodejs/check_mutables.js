const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const mutsPath = path.join(process.cwd(), '.gm', 'mutables.yml');
if (fs.existsSync(mutsPath)) {
  try {
    const content = fs.readFileSync(mutsPath, 'utf8');
    const data = yaml.load(content);
    if (data && Array.isArray(data)) {
      console.log(`Found ${data.length} mutable(s):`);
      data.forEach(m => {
        console.log(`  - ${m.id}: ${m.status}`);
      });
    } else {
      console.log('mutables.yml is empty or invalid');
    }
  } catch (e) {
    console.error('Error parsing YAML:', e.message);
    process.exit(1);
  }
} else {
  console.log('mutables.yml does not exist (work is unblocked)');
}
