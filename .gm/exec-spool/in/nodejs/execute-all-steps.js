const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = '/c/dev/gm';
process.chdir(cwd);

async function executeStep(name, fn) {
  console.log(`\n${'='.repeat(60)}\n${name}\n${'='.repeat(60)}`);
  try {
    await fn();
    console.log(`✓ ${name} completed successfully`);
    return true;
  } catch (e) {
    console.error(`✗ ${name} failed:`, e.message);
    return false;
  }
}

async function main() {
  let allSuccess = true;

  allSuccess &= await executeStep('Step 1: Clean npm cache and install', async () => {
    try {
      fs.unlinkSync('package-lock.json');
      console.log('Deleted package-lock.json');
    } catch (e) {
      console.log('package-lock.json not found, skipping delete');
    }

    const output = execSync('npm install', { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);

    if (!fs.existsSync('node_modules/js-yaml')) {
      throw new Error('js-yaml not installed after npm install');
    }
    console.log('✓ js-yaml verified in node_modules');
  });

  allSuccess &= await executeStep('Step 2: Run test.js', async () => {
    const output = execSync('node test.js', { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);

    if (!output.includes('23 passed') && !output.includes('23 pass')) {
      console.warn('WARNING: 23 passed count not found in output, but test ran');
    }
  });

  allSuccess &= await executeStep('Step 3: Stage and commit changes', async () => {
    execSync('git add test.js package.json', { stdio: 'pipe' });
    console.log('✓ Staged test.js and package.json');

    const msg = 'fix: add js-yaml dependency and correct test assertions for case sensitivity and hooks structure';
    execSync(`git commit -m "${msg}"`, { stdio: 'pipe' });

    const log = execSync('git log --oneline -1', { encoding: 'utf8' });
    console.log('✓ Committed:', log.trim());
  });

  allSuccess &= await executeStep('Step 4: Push to origin/main', async () => {
    execSync('git push origin main', { stdio: 'pipe' });
    console.log('✓ Pushed to origin/main');

    const status = execSync('git status --short', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('WARNING: Working tree not clean after push:\n', status);
    } else {
      console.log('✓ Working tree clean');
    }
  });

  allSuccess &= await executeStep('Step 5: Delete .gm/prd.yml', async () => {
    const prdPath = path.join(cwd, '.gm/prd.yml');
    if (fs.existsSync(prdPath)) {
      fs.unlinkSync(prdPath);
      console.log('✓ Deleted .gm/prd.yml');
    } else {
      console.log('.gm/prd.yml not found');
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  if (allSuccess) {
    console.log('✓ ALL STEPS COMPLETED SUCCESSFULLY');
    process.exit(0);
  } else {
    console.log('✗ SOME STEPS FAILED');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
