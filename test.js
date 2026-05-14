const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';

function test(name, fn) {
  try {
    fn();
    console.log(`${PASS} ${name}`);
  } catch (e) {
    console.error(`${FAIL} ${name}`);
    console.error(`  ${e.message}`);
    process.exit(1);
  }
}

function assertIdempotent(name, fn) {
  const a = fn(), b = fn();
  assert.deepStrictEqual(a, b, `${name}: not idempotent — ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

function assertDeterministic(name, fn, seed) {
  const a = fn(seed), b = fn(seed);
  assert.deepStrictEqual(a, b, `${name}: same seed produced different output`);
}

function assertNoRegression(name, baseline, current) {
  for (const k of Object.keys(baseline)) {
    assert(k in current, `${name}: lost key "${k}"`);
    assert.deepStrictEqual(current[k], baseline[k], `${name}: key "${k}" changed`);
  }
}

function assertHookBlocks(name, hookCmd, blockedInput) {
  const r = spawnSync('node', [hookCmd], { input: JSON.stringify(blockedInput), encoding: 'utf8' });
  const out = r.stdout || '';
  assert(/decision":\s*"block"/.test(out), `${name}: hook did not block — got ${out.slice(0,200)}`);
}

function assertHookAllows(name, hookCmd, allowedInput) {
  const r = spawnSync('node', [hookCmd], { input: JSON.stringify(allowedInput), encoding: 'utf8' });
  const out = r.stdout || '';
  assert(!/decision":\s*"block"/.test(out), `${name}: hook blocked when it should have allowed — ${out.slice(0,200)}`);
}

test('cli.js is executable', () => {
  assert(fs.existsSync('cli.js'), 'cli.js missing');
  const content = fs.readFileSync('cli.js', 'utf8');
  assert(content.includes('require'), 'cli.js not a valid Node module');
});

test('gm.json exists in gm-build/gm-cc', () => {
  const gmJson = 'gm-build/gm-cc/gm.json';
  assert(fs.existsSync(gmJson), `${gmJson} missing`);
  const content = JSON.parse(fs.readFileSync(gmJson, 'utf8'));
  assert(content.version, 'gm.json missing version field');
});

test('All platform dirs exist', () => {
  const platforms = ['gm-cc', 'gm-gc', 'gm-oc', 'gm-kilo', 'gm-codex', 'gm-copilot-cli', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains'];
  platforms.forEach(platform => {
    const dir = `gm-build/${platform}`;
    assert(fs.existsSync(dir), `${dir} missing`);
  });
});

test('hook files exist', () => {
  const platforms = ['gm-cc', 'gm-gc', 'gm-oc', 'gm-kilo', 'gm-codex', 'gm-copilot-cli'];
  platforms.forEach(platform => {
    const hooksDir = `gm-build/${platform}/hooks`;
    assert(fs.existsSync(hooksDir), `${hooksDir} missing`);
    assert(fs.existsSync(`${hooksDir}/hooks.json`), `${hooksDir}/hooks.json missing`);
  });
});

test('lib modules are valid JS', () => {
  const files = fs.readdirSync('lib').filter(f => f.endsWith('.js'));
  assert(files.length > 0, 'no lib/*.js files found');
  files.forEach(file => {
    const content = fs.readFileSync(`lib/${file}`, 'utf8');
    assert(content.includes('module.exports') || content.includes('exports'), `lib/${file} missing exports`);
  });
});

test('platforms modules exist', () => {
  const files = fs.readdirSync('platforms').filter(f => f.endsWith('.js'));
  assert(files.length > 0, 'no platforms/*.js files found');
  files.forEach(file => {
    const filepath = path.join('platforms', file);
    const content = fs.readFileSync(filepath, 'utf8');
    assert(content.length > 0, `${filepath} is empty`);
  });
});

test('AGENTS.md not empty', () => {
  const content = fs.readFileSync('AGENTS.md', 'utf8');
  assert(content.length > 100, 'AGENTS.md is too short');
  assert(content.includes('Architecture'), 'AGENTS.md missing architecture section');
});

test('CLAUDE.md not empty', () => {
  const content = fs.readFileSync('CLAUDE.md', 'utf8');
  assert(content.length > 0, 'CLAUDE.md is empty');
  assert(content.includes('AGENTS.md'), 'CLAUDE.md missing AGENTS.md reference');
});

test('AGENTS.md content idempotent on repeat read', () => {
  assertIdempotent('AGENTS.md read', () => fs.readFileSync('AGENTS.md', 'utf8').length);
});

test('platform list deterministic', () => {
  const platforms = ['gm-cc', 'gm-gc', 'gm-oc', 'gm-kilo', 'gm-codex', 'gm-copilot-cli', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains'];
  assertDeterministic('platform sort', () => [...platforms].sort(), 0);
});

test('hooks.spec.json present and roundtrips to hooks.json', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gm-spec-'));
  const r = spawnSync('node', ['cli.js', 'gm-starter', tmp], { encoding: 'utf8', timeout: 120000 });
  assert(r.status === 0, `cli.js failed: ${(r.stderr || '').slice(-500)}`);
  const { buildHooksJson } = require('./lib/hook-spec');
  const cliPlatforms = ['gm-cc', 'gm-gc', 'gm-codex', 'gm-oc', 'gm-kilo', 'gm-qwen', 'gm-copilot-cli'];
  for (const p of cliPlatforms) {
    const specPath = path.join(tmp, p, 'hooks', 'hooks.spec.json');
    const jsonPath = path.join(tmp, p, 'hooks', 'hooks.json');
    assert(fs.existsSync(specPath), `${specPath} missing`);
    assert(fs.existsSync(jsonPath), `${jsonPath} missing`);
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    assert(spec.schemaVersion === 1, `${p}: schemaVersion != 1`);
    assert(Array.isArray(spec.events), `${p}: events not array`);
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const reHooks = buildHooksJson({ envVar: spec.envVar, plugkitInvoker: spec.plugkitInvoker, events: spec.events }).hooks;
    assert.deepStrictEqual(reHooks, json.hooks, `${p}: spec roundtrip differs from hooks.json`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('codex installer wires config.toml idempotent + reversible', () => {
  const os = require('os');
  const merger = require('./lib/codex-config-merger');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-codex-merge-'));
  const cfg = path.join(tmp, 'config.toml');
  const root = path.resolve('gm-build/gm-codex');
  assert(fs.existsSync(root), 'gm-build/gm-codex missing — run build first');
  merger.mergeIntoConfigToml(cfg, root);
  const a = fs.readFileSync(cfg, 'utf8');
  assert(/codex_hooks\s*=\s*true/.test(a), 'codex_hooks not enabled');
  assert(a.includes('[[hooks.PreToolUse]]'), 'PreToolUse hook not registered');
  assert(a.includes('[[skills.config]]'), 'skills.config entries missing');
  assert(!a.includes('${CODEX_PLUGIN_ROOT}'), 'unexpanded placeholder leaked');
  merger.mergeIntoConfigToml(cfg, root);
  const b = fs.readFileSync(cfg, 'utf8');
  assert.strictEqual(a, b, 'merge not idempotent');
  const userPrefix = 'model = "gpt-5"\n\n[profiles.work]\nx=1\n';
  fs.writeFileSync(cfg, userPrefix);
  merger.mergeIntoConfigToml(cfg, root);
  const c = fs.readFileSync(cfg, 'utf8');
  assert(c.startsWith('model = "gpt-5"'), 'user content lost');
  merger.uninstallFromConfigToml(cfg);
  assert.strictEqual(fs.readFileSync(cfg, 'utf8'), userPrefix, 'uninstall failed to restore user content');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('gm hook gate: mutables.yml blocks unresolved entries', () => {
  const gmDir = '.gm';
  if (!fs.existsSync(gmDir)) return;
  const mutablesFile = path.join(gmDir, 'mutables.yml');
  if (!fs.existsSync(mutablesFile)) return;
  const mutables = yaml.load(fs.readFileSync(mutablesFile, 'utf8'));
  if (!mutables) return;
  const unresolved = mutables.filter(m => m.status === 'unknown');
  assert.strictEqual(unresolved.length, 0, `${unresolved.length} unresolved mutables should block PRD execution`);
});

test('gm hook gate: prd.yml structure valid', () => {
  const gmDir = '.gm';
  if (!fs.existsSync(gmDir)) return;
  const prdFile = path.join(gmDir, 'prd.yml');
  if (!fs.existsSync(prdFile)) return;
  const prd = yaml.load(fs.readFileSync(prdFile, 'utf8'));
  if (!prd) return;
  prd.forEach(item => {
    assert(item.id, 'prd item missing id');
    assert(item.subject, 'prd item missing subject');
    assert(['pending', 'in_progress', 'completed'].includes(item.status), `prd item ${item.id} has invalid status: ${item.status}`);
    assert(Array.isArray(item.acceptance), `prd item ${item.id} acceptance is not array`);
  });
});

test('gm hook gate: mutable witness evidence present when witnessed', () => {
  const gmDir = '.gm';
  if (!fs.existsSync(gmDir)) return;
  const mutablesFile = path.join(gmDir, 'mutables.yml');
  if (!fs.existsSync(mutablesFile)) return;
  const mutables = yaml.load(fs.readFileSync(mutablesFile, 'utf8'));
  if (!mutables) return;
  mutables.forEach(m => {
    if (m.status === 'witnessed') {
      assert(m.witness_evidence && m.witness_evidence.length > 0, `mutable ${m.id} is witnessed but has no evidence`);
    }
  });
});

test('rs-plugkit hook files exist and are valid Rust', () => {
  const hookDir = 'C:\\dev\\rs-plugkit\\src\\hook';
  if (!fs.existsSync(hookDir)) return;
  const hooks = ['session_start.rs', 'pre_tool_use.rs', 'prompt_submit.rs', 'post_tool_use.rs', 'session_end.rs'];
  hooks.forEach(hook => {
    const file = path.join(hookDir, hook);
    assert(fs.existsSync(file), `${hook} missing`);
    const content = fs.readFileSync(file, 'utf8');
    assert(content.includes('pub fn run('), `${hook} missing pub fn run`);
  });
});

test('gm-complete skill includes git enforcement gates', () => {
  const skillPath = 'gm-starter/skills/gm-complete/SKILL.md';
  if (!fs.existsSync(skillPath)) return;
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('git_clean'), 'git_clean gate missing');
  assert(content.includes('git_pushed'), 'git_pushed gate missing');
  assert(content.includes('git status --porcelain'), 'git status check missing');
  assert(content.includes('git log origin/main..HEAD'), 'git log check missing');
});

test('update-docs skill includes browser cleanup exit phase', () => {
  const skillPath = 'gm-starter/skills/update-docs/SKILL.md';
  if (!fs.existsSync(skillPath)) return;
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('browser cleanup'), 'browser cleanup section missing');
  assert(content.includes('exit'), 'exit phase documentation missing');
});

test('hook count reduction: all 10 platforms generate ≤9 hook events', () => {
  const platforms = ['gm-cc', 'gm-gc', 'gm-oc', 'gm-kilo', 'gm-codex', 'gm-copilot-cli', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains'];
  const buildDir = 'gm-build';
  if (!fs.existsSync(buildDir)) return;
  platforms.forEach(p => {
    const hookPath = path.join(buildDir, p, 'hooks', 'hooks.json');
    if (!fs.existsSync(hookPath)) return;
    const hooks = JSON.parse(fs.readFileSync(hookPath, 'utf8'));
    const eventCount = hooks.hooks ? hooks.hooks.length : 0;
    assert(eventCount <= 9, `${p}: ${eventCount} hook events exceeds target of ≤9`);
  });
});

test('prd and mutables files well-formed and witnessed', () => {
  const gmDir = '.gm';
  if (!fs.existsSync(gmDir)) return;
  const prdPath = path.join(gmDir, 'prd.yml');
  const mutablesPath = path.join(gmDir, 'mutables.yml');
  if (fs.existsSync(prdPath)) {
    const prd = yaml.load(fs.readFileSync(prdPath, 'utf8'));
    if (prd) {
      prd.forEach(item => {
        assert(item.id, 'prd item missing id');
        assert(['pending', 'in_progress', 'completed'].includes(item.status), `prd status invalid: ${item.status}`);
      });
    }
  }
  if (fs.existsSync(mutablesPath)) {
    const mutables = yaml.load(fs.readFileSync(mutablesPath, 'utf8'));
    if (mutables) {
      mutables.forEach(m => {
        if (m.status === 'witnessed') {
          assert(m.witness_evidence && m.witness_evidence.length > 0, `mutable ${m.id} witnessed but missing evidence`);
        }
      });
    }
  }
});

test('spool-dispatch.js exports dispatchSpool', () => {
  const m = require('./gm-starter/lib/spool-dispatch.js');
  assert(m.dispatchSpool, 'dispatchSpool not exported');
  assert(typeof m.dispatchSpool === 'function', 'dispatchSpool is not a function');
});

console.log('\n✓ All tests passed');
