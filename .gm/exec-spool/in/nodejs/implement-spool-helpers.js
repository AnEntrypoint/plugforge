const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  console.log('[implement-spool] Creating spool dispatch helpers in gm-skill...');

  const gmSkillPath = 'C:\\dev\\gm\\gm-starter\\gm-skill';

  // Check if gm-skill exists
  if (!fs.existsSync(gmSkillPath)) {
    console.error('[implement-spool] gm-skill not found at:', gmSkillPath);
    process.exit(1);
  }

  // Create spool-helpers.js with four helper functions
  const spoolHelpersCode = `const fs = require('fs');
const path = require('path');
const os = require('os');

function getSpoolDir() {
  const appdata = process.env.APPDATA || process.env.HOME;
  return path.join(appdata, '.claude', 'exec-spool');
}

function writeSpool(body, lang = 'nodejs') {
  const spoolDir = getSpoolDir();
  const inDir = path.join(spoolDir, 'in', lang);

  if (!fs.existsSync(inDir)) {
    fs.mkdirSync(inDir, { recursive: true });
  }

  // Find next available ID
  let id = 0;
  while (fs.existsSync(path.join(inDir, \`\${id}.txt\`)) ||
         fs.existsSync(path.join(inDir, \`\${id}.js\`)) ||
         fs.existsSync(path.join(inDir, \`\${id}.py\`))) {
    id++;
  }

  const ext = lang === 'nodejs' ? '.js' : lang === 'python' ? '.py' : '.sh';
  const filePath = path.join(inDir, \`\${id}\${ext}\`);

  fs.writeFileSync(filePath, body);
  return id;
}

function readSpoolOutput(id) {
  const spoolDir = getSpoolDir();
  const outFile = path.join(spoolDir, 'out', \`\${id}.out\`);

  if (fs.existsSync(outFile)) {
    return fs.readFileSync(outFile, 'utf8');
  }
  return null;
}

function waitForCompletion(id, timeoutMs = 30000) {
  const spoolDir = getSpoolDir();
  const jsonFile = path.join(spoolDir, 'out', \`\${id}.json\`);
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (fs.existsSync(jsonFile)) {
        clearInterval(checkInterval);
        try {
          const meta = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
          resolve(meta);
        } catch (e) {
          reject(e);
        }
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        reject(new Error(\`Timeout waiting for task \${id}\`));
      }
    }, 100);
  });
}

function getAllOutputs() {
  const spoolDir = getSpoolDir();
  const outDir = path.join(spoolDir, 'out');

  if (!fs.existsSync(outDir)) {
    return {};
  }

  const results = {};
  const files = fs.readdirSync(outDir);

  files.forEach(file => {
    if (file.endsWith('.json')) {
      const id = file.replace('.json', '');
      try {
        results[id] = JSON.parse(fs.readFileSync(path.join(outDir, file), 'utf8'));
      } catch (e) {
        // Skip invalid JSON
      }
    }
  });

  return results;
}

module.exports = {
  writeSpool,
  readSpoolOutput,
  waitForCompletion,
  getAllOutputs
};
`;

  const spoolHelpersPath = path.join(gmSkillPath, 'spool-helpers.js');
  fs.writeFileSync(spoolHelpersPath, spoolHelpersCode);
  console.log('[implement-spool] Created spool-helpers.js');

  // Update index.js to export spool helpers
  const indexPath = path.join(gmSkillPath, 'index.js');
  let indexContent = '';

  if (fs.existsSync(indexPath)) {
    indexContent = fs.readFileSync(indexPath, 'utf8');
  }

  // Add spool export if not already there
  if (!indexContent.includes('spool-helpers')) {
    const spoolExport = `\nconst spool = require('./spool-helpers');\n\nmodule.exports = {\n  spool,\n  ...module.exports\n};`;

    if (indexContent.trim() === '' || !indexContent.includes('module.exports')) {
      indexContent = \`const spool = require('./spool-helpers');\n\nmodule.exports = {\n  spool\n};\`;
    } else {
      // Insert spool export into existing exports
      indexContent = indexContent.replace(
        /module\.exports\s*=\s*\{/,
        'const spool = require(\'./spool-helpers\');\n\nmodule.exports = {\n  spool,'
      );
    }
  }

  fs.writeFileSync(indexPath, indexContent);
  console.log('[implement-spool] Updated index.js with spool exports');

  // Create README section for spool helpers
  const readmePath = path.join(gmSkillPath, 'README.md');
  let readmeContent = '';

  if (fs.existsSync(readmePath)) {
    readmeContent = fs.readFileSync(readmePath, 'utf8');
  }

  if (!readmeContent.includes('## Spool Dispatch Helpers')) {
    const spoolDocs = \`\n## Spool Dispatch Helpers

The gm-skill package exports spool dispatch helpers for elegant interaction with the exec spool:

\\\`\\\`\\\`javascript
const { spool } = require('gm-skill');

// Write a spool task
const taskId = spool.writeSpool('console.log("hello")', 'nodejs');

// Wait for completion
const meta = await spool.waitForCompletion(taskId);
console.log('Task completed:', meta.exitCode);

// Read output
const output = spool.readSpoolOutput(taskId);

// Get all outputs
const allResults = spool.getAllOutputs();
\\\`\\\`\\\`

### API

- \\\`writeSpool(body, lang)\\\` — Write spool task, return task ID
- \\\`readSpoolOutput(id)\\\` — Read stdout of completed task
- \\\`waitForCompletion(id, timeoutMs)\\\` — Wait for task completion, return metadata
- \\\`getAllOutputs()\\\` — Get all completed task metadata
\`;

    readmeContent += spoolDocs;
    fs.writeFileSync(readmePath, readmeContent);
    console.log('[implement-spool] Updated README.md with spool documentation');
  }

  console.log('[implement-spool] Spool helpers implementation complete');
} catch (e) {
  console.error('[implement-spool] Error:', e.message);
  process.exit(1);
}
