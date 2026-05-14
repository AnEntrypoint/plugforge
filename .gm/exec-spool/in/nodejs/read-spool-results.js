const fs = require('fs');
const path = require('path');
const os = require('os');

const outDir = path.join(os.homedir(), '.claude', 'gm-log'); // Placeholder - actual is in exec-spool/out
const spoolOutDir = '/c/dev/gm/.gm/exec-spool/out';

try {
  if (!fs.existsSync(spoolOutDir)) {
    console.log(JSON.stringify({ status: 'spool_not_ready', message: 'exec-spool/out directory does not exist yet' }, null, 2));
    process.exit(0);
  }

  const files = fs.readdirSync(spoolOutDir);
  const jsonFiles = files.filter(f => f.endsWith('.json')).map(f => {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(spoolOutDir, f), 'utf-8'));
      return { file: f, ...content };
    } catch {
      return { file: f, error: 'parse failed' };
    }
  });

  const results = {
    total_completed: jsonFiles.length,
    sample_tasks: jsonFiles.slice(0, 5),
    latest_timestamp: Math.max(...jsonFiles.map(f => f.endedAt || 0))
  };

  console.log(JSON.stringify(results, null, 2));
} catch (e) {
  console.error('Error reading spool:', e.message);
  process.exit(1);
}
