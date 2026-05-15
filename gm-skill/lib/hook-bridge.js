const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function resolvePlugkitJs() {
  const local = path.join(process.cwd(), 'gm-starter', 'bin', 'plugkit.js');
  if (fs.existsSync(local)) return local;
  return path.join(__dirname, '..', '..', 'gm-starter', 'bin', 'plugkit.js');
}

function runHook(subcommand, options = {}) {
  const plugkitJs = resolvePlugkitJs();
  const args = [plugkitJs, 'hook', subcommand];
  const env = Object.assign({}, process.env, options.env || {});
  const result = spawnSync('node', args, {
    cwd: options.cwd || process.cwd(),
    env,
    encoding: 'utf8',
    timeout: options.timeoutMs || 120000,
    windowsHide: true,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : null,
  };
}

function sessionStart(options = {}) { return runHook('session-start', options); }
function preToolUse(options = {}) { return runHook('pre-tool-use', options); }
function promptSubmit(options = {}) { return runHook('prompt-submit', options); }
function stop(options = {}) { return runHook('stop', options); }
function stopGit(options = {}) { return runHook('stop-git', options); }
function postToolUse(options = {}) { return runHook('post-tool-use', options); }
function skillLifecycle(options = {}) {
  const plugkitJs = resolvePlugkitJs();
  const args = [plugkitJs, 'skill-lifecycle'];
  if (options.sessionStart === false) args.push('--session-start=false');
  if (options.promptSubmit === false) args.push('--prompt-submit=false');
  if (options.preToolUse === false) args.push('--pre-tool-use=false');
  if (options.postToolUse === false) args.push('--post-tool-use=false');
  if (options.stop === true) args.push('--stop=true');
  if (options.stopGit === true) args.push('--stop-git=true');
  const env = Object.assign({}, process.env, options.env || {});
  const result = spawnSync('node', args, {
    cwd: options.cwd || process.cwd(),
    env,
    encoding: 'utf8',
    timeout: options.timeoutMs || 120000,
    windowsHide: true,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : null,
  };
}

module.exports = { runHook, sessionStart, preToolUse, promptSubmit, postToolUse, skillLifecycle, stop, stopGit };
