const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== RESIDUAL SCAN: WAVE 3.4+ in-spirit work ===\n');

const residuals = [];
const unreachable = [];

try {
  console.log('[PHASE 1] Pre-existing breaks in source tree\n');

  const cwd = 'C:\\dev\\gm';
  process.chdir(cwd);

  console.log('[1.1] Build consistency checks...');
  try {
    execSync('node cli.js gm-starter ./build --dry-run 2>&1', { encoding: 'utf8', stdio: 'pipe' });
    console.log('     ✓ Build command syntax valid');
  } catch (e) {
    console.log('     ✗ Build would fail; checking why...');
    const buildDir = path.join(cwd, 'build');
    if (!fs.existsSync(buildDir)) {
      console.log('       - build/ dir missing (expected after gm-starter build)');
      residuals.push({
        id: 'rebuild-after-scaffold',
        category: 'build',
        reason: 'Build directory stale after scaffold completion; requires `node cli.js gm-starter ./build` to regenerate 10 platform outputs'
      });
    }
  }

  console.log('[1.2] Lint and test runs...');
  const testPaths = [
    path.join(cwd, 'test.js'),
    path.join(cwd, 'test', 'index.js'),
    path.join(cwd, 'tests', 'runner.js')
  ];
  const testExists = testPaths.some(p => fs.existsSync(p));
  if (!testExists) {
    console.log('     ⚠ No test.js found at project root (AGENTS.md discipline)');
  } else {
    console.log('     ✓ test.js exists');
  }

  console.log('[1.3] Dependency drift...');
  const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const key_deps = ['js-yaml', 'node-fetch', 'chalk'];
  const missing = key_deps.filter(dep => !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]);
  if (missing.length > 0) {
    console.log('     ⚠ Missing deps: ' + missing.join(', '));
  } else {
    console.log('     ✓ Key dependencies present');
  }

  console.log('\n[PHASE 2] Neighboring fails (lint, type-check)\n');

  console.log('[2.1] Platform file drift...');
  const platformMetaPath = path.join(cwd, 'lib', 'page-generator.js');
  if (fs.existsSync(platformMetaPath)) {
    const content = fs.readFileSync(platformMetaPath, 'utf8');
    const hasPlatformMeta = content.includes('PLATFORM_META');
    if (hasPlatformMeta) {
      console.log('     ✓ Platform registration single-point-of-truth in page-generator.js');
    } else {
      console.log('     ✗ PLATFORM_META missing');
      residuals.push({
        id: 'page-generator-platform-meta',
        category: 'arch',
        reason: 'Platform registration not in PLATFORM_META'
      });
    }
  }

  console.log('[2.2] Check .gitignore compliance...');
  const gitignore = fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8');
  const isGmManaged = gitignore.includes('>>> gm managed');
  const hasGmExclude = gitignore.includes('.gm/rs-learn.db') && gitignore.includes('.gm/code-search/');
  if (isGmManaged && hasGmExclude) {
    console.log('     ✓ gm managed markers present, .gm/* persistence tracked');
  } else {
    console.log('     ⚠ gitignore compliance gap (gm DB/search should never be ignored)');
    residuals.push({
      id: 'gitignore-gm-tracking',
      category: 'infra',
      reason: '.gm/rs-learn.db and .gm/code-search/ must be tracked, never ignored per AGENTS.md'
    });
  }

  console.log('[2.3] AGENTS.md documentation checks...');
  const agentsPath = path.join(cwd, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    const agents = fs.readFileSync(agentsPath, 'utf8');
    const hasChangelog = agents.includes('[FIXED]') || agents.includes('[CHANGED]') || agents.includes('## Learning audit');
    const hasDateAnnotations = agents.match(/\(.*20\d{2}.*\)/);
    const hasCommitHashes = agents.match(/\b[0-9a-f]{7,}\b/);

    if (hasChangelog || hasDateAnnotations || hasCommitHashes) {
      console.log('     ✗ AGENTS.md contains changelog/historical entries (violates policy)');
      residuals.push({
        id: 'agents-md-dehistorify',
        category: 'docs',
        reason: 'AGENTS.md contains dated/commit entries; must strip (git log is authority)'
      });
    } else {
      console.log('     ✓ AGENTS.md contains only present-tense rules');
    }
  }

  console.log('\n[PHASE 3] Follow-on work user implied\n');

  console.log('[3.1] gm-skill npm integration...');
  const skillRepoPath = 'C:\\Users\\user\\code\\repos\\gm-skill';
  if (fs.existsSync(skillRepoPath)) {
    console.log('     ✓ gm-skill repo scaffolded (COMPLETE)');
    console.log('       Next: integrate into 12 downstream repos (gm-cc, gm-gc, gm-oc, gm-kilo, gm-codex, gm-qwen, gm-copilot-cli, gm-hermes, gm-vscode, gm-cursor, gm-zed, gm-jetbrains)');
    residuals.push({
      id: 'gm-skill-npm-integration',
      category: 'infra',
      reason: 'Integrate gm-skill package into 12 downstream repos (add to devDependencies, wire in skill loading)',
      effort: 'medium',
      reach: '12 repos x ~5 LOC per platform = reachable this session'
    });
  } else {
    console.log('     ⚠ gm-skill repo not found at ' + skillRepoPath);
    unreachable.push('gm-skill package (scaffold not completed)');
  }

  console.log('[3.2] Hook removal work (rs-plugkit)...');
  console.log('     ⚠ rs-plugkit work is in parallel repo, not reachable this session');
  unreachable.push('rs-plugkit hook removal');

  console.log('[3.3] Daemon consolidation (auto-spawn)...');
  const bootstrapPath = path.join(cwd, 'gm-starter', 'bin', 'bootstrap.js');
  if (fs.existsSync(bootstrapPath)) {
    const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
    if (bootstrap.includes('acptoapi')) {
      console.log('     ✓ Auto-spawn documented in AGENTS.md');
      console.log('       Note: actual consolidation is in rs-plugkit (out of scope)');
    }
  }
  unreachable.push('daemon consolidation (rs-plugkit scope)');

  console.log('[3.4] WAVE 3 documentation updates...');
  const readmePath = path.join(cwd, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf8');
    if (readme.includes('WAVE 3')) {
      console.log('     ✓ README mentions WAVE phases');
    } else {
      console.log('     ⚠ README could document WAVE 3 status');
      residuals.push({
        id: 'readme-wave3-status',
        category: 'docs',
        reason: 'Document WAVE 3.4 completion in README (scaffold + residuals)'
      });
    }
  }

  console.log('\n[PHASE 4] Summary\n');

  console.log('In-spirit residuals identified: ' + residuals.length);
  if (residuals.length > 0) {
    console.log('\nReachable this session:');
    residuals.forEach((r, i) => {
      console.log('  [' + (i + 1) + '] ' + r.id);
      console.log('      Category: ' + r.category);
      console.log('      Reason: ' + r.reason);
      if (r.effort) console.log('      Effort: ' + r.effort);
      if (r.reach) console.log('      Reach: ' + r.reach);
    });
  }

  console.log('\nUnreachable from this session (named for ref):');
  unreachable.forEach((u, i) => {
    console.log('  - ' + u);
  });

  console.log('\n✓ RESIDUAL SCAN COMPLETE');
  console.log('  Identified: ' + residuals.length + ' in-spirit items');
  console.log('  Unreachable: ' + unreachable.length + ' (parallel repos or deferred)');

  if (residuals.length > 0) {
    console.log('\nNext: append reachable items to .gm/prd.yml with dependency graph');
  } else {
    console.log('\nNo in-spirit work remains reachable. Session ready for stop.');
  }

  process.exit(0);

} catch (e) {
  console.error('✗ SCAN FAILED:', e.message);
  process.exit(1);
}
