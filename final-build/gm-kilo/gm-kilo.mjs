import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANG_ALIASES = { js:'nodejs',javascript:'nodejs',ts:'typescript',node:'nodejs',py:'python',sh:'bash',shell:'bash',zsh:'bash' };
const FORBIDDEN_TOOLS = new Set(['glob','Glob','fs.glob','grep','Grep','search_file_content','Find','find']);
const FORBIDDEN_FILE_RE = [/\.(test|spec)\.(js|ts|jsx|tsx|mjs|cjs)$/, /^(jest|vitest|mocha|ava|jasmine|tap)\.(config|setup)/, /\.(snap|stub|mock|fixture)\.(js|ts|json)$/];
const FORBIDDEN_PATH_RE = ['/__tests__/','/test/','/tests/','/fixtures/','/test-data/',"/__mocks__/"];
const DOC_BLOCK_RE = /\.(md|txt)$/;

function runPlugkit(args) {
  const bin = join(__dirname, '..', 'bin', 'plugkit.js');
  if (!existsSync(bin)) return '';
  try {
    const r = spawnSync('node', [bin, ...args], { encoding: 'utf-8', timeout: 15000, windowsHide: true });
    return (r.stdout || '').trim() || (r.stderr || '').trim();
  } catch(e) { return ''; }
}

function runPlugkitDetached(args) {
  const bin = join(__dirname, '..', 'bin', 'plugkit.js');
  if (!existsSync(bin)) return;
  try {
    const child = spawn('node', [bin, ...args], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
  } catch(e) {}
}

function safePrintf(s) {
  return "printf '%s' '" + String(s).replace(/'/g,"'\\\\''")+"'";
}

function stripFooter(s) { return s ? s.replace(/\n\[Running tools\][\s\S]*$/, '').trimEnd() : ''; }

function runExecSync(rawLang, code, cwd) {
  const lang = LANG_ALIASES[rawLang] || rawLang || 'nodejs';
  const projectDir = cwd || process.cwd();
  const spoolBase = join(projectDir, '.gm', 'exec-spool');
  const taskId = Date.now() + '-' + Math.random().toString(16).slice(2, 8);

  const isVerb = ['codesearch','recall','memorize','wait','sleep','status','close','browser','runner','type','kill-port','forget','feedback','discipline','pause','health'].includes(lang);
  const langDir = lang.match(/^(nodejs|python|bash|typescript|go|rust|c|cpp|java|deno)$/) ? lang : 'nodejs';
  const ext = {nodejs:'js',python:'py',bash:'sh',typescript:'ts',go:'go',rust:'rs',c:'c',cpp:'cpp',java:'java',deno:'ts'}[langDir] || 'js';

  const inDir = join(spoolBase, 'in', isVerb ? lang : langDir);
  const outDir = join(spoolBase, 'out');
  const inFile = join(inDir, taskId + (isVerb ? '.txt' : '.' + ext));
  const jsonFile = join(outDir, taskId + '.json');

  try { fs.mkdirSync(inDir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true }); } catch(e) {}
  writeFileSync(inFile, code, 'utf-8');

  const start = Date.now();
  while (Date.now() - start < 28000) {
    if (existsSync(jsonFile)) {
      try {
        const meta = JSON.parse(readFileSync(jsonFile, 'utf-8'));
        const outFile = jsonFile.replace(/\.json$/, '.out');
        const errFile = jsonFile.replace(/\.json$/, '.err');
        const stdout = existsSync(outFile) ? readFileSync(outFile, 'utf-8') : '';
        const stderr = existsSync(errFile) ? readFileSync(errFile, 'utf-8') : '';
        const o = stdout.trimEnd(), e = stripFooter(stderr).trimEnd();
        return o && e ? o + '\n[stderr]\n' + e : o || e || '(no output)';
      } catch(e) {}
    }
    try { require('child_process').execSync('sleep 0.05', { stdio: 'ignore' }); } catch(e) { const s = Date.now(); while(Date.now()-s<50){} }
  }
  return '[spool dispatch timeout after 28s]';
}

function ensureSpoolWatcher(dir) {
  try {
    const spoolBase = join(dir, '.gm', 'exec-spool');
    const pidFile = join(spoolBase, '.watcher.pid');
    try { fs.mkdirSync(spoolBase, { recursive: true }); } catch(e) {}
    const alreadyRunning = existsSync(pidFile) && (() => { try { const p = parseInt(readFileSync(pidFile,'utf-8')); process.kill(p,0); return true; } catch(e) { return false; } })();
    if (!alreadyRunning) {
      const child = spawn('node', [join(__dirname, '..', 'bin', 'plugkit.js'), 'spool'], {
        detached: true, stdio: 'ignore', windowsHide: true,
        env: { ...process.env, RS_EXEC_SPOOL_DIR: spoolBase }
      });
      child.unref();
      if (child.pid) { try { writeFileSync(pidFile, String(child.pid), 'utf-8'); } catch(e) {} }
    }
  } catch(e) {}
}

const BANNED_BASH = ['grep','rg','find','glob','awk','sed','cat','head','tail'];
function bashBannedTool(code) {
  for (const t of BANNED_BASH) { if (new RegExp('(^|\\||;|&&|\\$\\()\\s*'+t+'(\\s|$)').test(code)) return t; }
  return null;
}

let sessionStarted = false;

export async function GmPlugin({ directory }) {
  const agentMd = join(__dirname, '..', 'agents', 'gm.md');
  const prdFile = join(directory, '.prd');
  const injectedSessions = new Set();

  return {
    'session.created': async () => {
      if (!sessionStarted) {
        sessionStarted = true;
        try { runPlugkitDetached(['hook', 'session-start']); } catch(e) {}
        try {
          const spoolBase = join(directory, '.gm', 'exec-spool');
          const pidFile = join(spoolBase, '.watcher.pid');
          try { fs.mkdirSync(spoolBase, { recursive: true }); } catch(e) {}
          const alreadyRunning = existsSync(pidFile) && (() => { try { const p = parseInt(readFileSync(pidFile,'utf-8')); process.kill(p,0); return true; } catch(e) { return false; } })();
          if (!alreadyRunning) {
            const child = spawn('node', [join(__dirname, '..', 'bin', 'plugkit.js'), 'spool'], {
              detached: true, stdio: 'ignore', windowsHide: true,
              env: { ...process.env, RS_EXEC_SPOOL_DIR: spoolBase }
            });
            child.unref();
            if (child.pid) { try { writeFileSync(pidFile, String(child.pid), 'utf-8'); } catch(e) {} }
          }
        } catch(e) {}
      }
    },

    'experimental.chat.system.transform': async (input, output) => {
      const gmDir = join(directory, '.gm');
      try {
        const giPath = join(directory, '.gitignore');
        const entry = '.gm-stop-verified';
        try {
          let content = existsSync(giPath) ? readFileSync(giPath,'utf-8') : '';
          if (!content.split('\n').some(l => l.trim() === entry)) {
            const nc = (content.endsWith('\n') || content === '') ? content + entry + '\n' : content + '\n' + entry + '\n';
            writeFileSync(giPath, nc, 'utf-8');
          }
        } catch(e) {}
      } catch(e) {}
      if (!sessionStarted) {
        sessionStarted = true;
        try { runPlugkitDetached(['hook', 'session-start']); } catch(e) {}
        try { ensureSpoolWatcher(directory); } catch(e) {}
      }
      try { const rules = readFileSync(agentMd,'utf-8'); if (rules) output.system.unshift(rules); } catch(e) {}
      try {
        if (existsSync(prdFile)) {
          const prd = readFileSync(prdFile,'utf-8').trim();
          if (prd) output.system.push('\nPENDING WORK (.prd):\n'+prd);
        }
      } catch(e) {}
      try {
        const needsGmPath = join(gmDir, 'needs-gm');
        if (existsSync(needsGmPath)) {
          output.system.push('\nCRITICAL: You MUST invoke the `gm` skill before any other tool. Your current state is BLOCKED by a safety gate until gm runs.');
        }
      } catch(e) {}
    },

    'experimental.chat.messages.transform': async (input, output) => {
      const msgs = output.messages;
      const lastUserIdx = msgs ? msgs.findLastIndex(m => m.info && m.info.role === 'user') : -1;
      if (lastUserIdx === -1) return;
      const msg = msgs[lastUserIdx];
      const sessionID = msg.info && msg.info.sessionID;
      if (sessionID && injectedSessions.has(sessionID)) return;
      if (sessionID) injectedSessions.add(sessionID);
      const textPart = msg.parts && msg.parts.find(p => p.type === 'text' && p.text && p.text.trim());
      const prompt = textPart ? textPart.text.trim() : '';
      const parts = [];
      parts.push('Invoke the `gm` skill to begin. Treat the `exec:` preamble as authoritative; host auto-detection is fallback only. Raw JIT code can also be written to `.gm/exec-spool/in/<lang>/<N>.<ext>` (e.g. in/nodejs/42.js) — the spool watcher executes it and writes out/<N>.json. Keep stale running tasks in view and prefer the latest task reminder over starting duplicate work.');
      const insight = runPlugkit(['codeinsight', directory]);
      if (insight && !insight.startsWith('Error')) parts.push('=== codeinsight ===\n'+insight);
      if (prompt) {
        const search = runPlugkit(['search', '--path', directory, prompt]);
        if (search && !search.startsWith('No results')) parts.push('=== search ===\n'+search);
      }
      const injection = '<system-reminder>\n'+parts.join('\n\n')+'\n</system-reminder>';
      if (textPart) textPart.text = injection + '\n' + textPart.text;
      else if (msg.parts) msg.parts.unshift({ type: 'text', text: injection });
    },

    'tool.execute.before': async (input, output) => {
      const gmDir = join(directory, '.gm');
      const needsGmPath = join(gmDir, 'needs-gm');
      const lastskillPath = join(gmDir, 'lastskill');
      const turnStatePath = join(gmDir, 'turn-state.json');
      const noMemoPath = join(gmDir, 'no-memorize-this-turn');
      const tool = input.tool || '';
      const args = (input.args || (output && output.args) || {});
      if (!sessionStarted) {
        sessionStarted = true;
        try { runPlugkitDetached(['hook', 'session-start']); } catch(e) {}
        try { ensureSpoolWatcher(directory); } catch(e) {}
      }
      const skillName = (args.skill || args.name || '').toString();
      if (FORBIDDEN_TOOLS.has(input.tool)) {
        throw new Error('Use the code-search skill for codebase exploration instead of '+input.tool+'. Describe what you need in plain language.');
      }
      if (tool === 'Skill' || tool === 'skill') {
        try {
          if (!existsSync(gmDir)) { try { require('fs').mkdirSync(gmDir, { recursive: true }); } catch(e) {} }
          if (skillName) writeFileSync(lastskillPath, skillName, 'utf-8');
          const norm = skillName.toLowerCase().replace(/^gm:/, '');
          if (norm === 'gm') { try { unlinkSync(needsGmPath); } catch(e) {} }
        } catch(e) {}
      } else {
        if (existsSync(needsGmPath)) {
          throw new Error('HARD CONSTRAINT: invoke the Skill tool with skill: "gm" before any other tool. The gm skill must be the first action after every user message.');
        }
        let turnState = null;
        try { turnState = JSON.parse(readFileSync(turnStatePath, 'utf-8')); } catch(e) {}
        if (turnState && (turnState.execCallsSinceMemorize || 0) >= 3 && !existsSync(noMemoPath)) {
          const isMemAgent = (tool === 'Agent' || tool === 'Task') && /memorize/i.test(JSON.stringify(args || {}));
          if (!isMemAgent) {
            throw new Error('3+ exec results have resolved unknowns without a memorize call. HARD BLOCK until you spawn at least one Agent(subagent_type="gm:memorize", model="haiku", run_in_background=true, prompt="## CONTEXT TO MEMORIZE\\n<fact>") OR write file .gm/no-memorize-this-turn (containing reason) to declare nothing memorable.');
          }
        }
        if (tool === 'write' || tool === 'Write' || tool === 'edit' || tool === 'Edit' || tool === 'NotebookEdit') {
          let lastSkill = '';
          try { lastSkill = readFileSync(lastskillPath, 'utf-8').trim(); } catch(e) {}
          if (lastSkill === 'gm-complete' || lastSkill === 'update-docs') {
            throw new Error('File edits are not permitted in ' + lastSkill + ' phase. Regress to gm-execute if changes are needed, or invoke gm-emit to re-emit.');
          }
        }
      }
      if (input.tool === 'EnterPlanMode') {
        throw new Error('Plan mode is disabled. Use the gm skill (PLAN→EXECUTE→EMIT→VERIFY→COMPLETE state machine) instead.');
      }
      if (input.tool === 'Task' && input.args?.subagent_type === 'Explore') {
        throw new Error('The Explore agent is blocked. Use exec:codesearch in the Bash tool instead.\n\nexec:codesearch\n<natural language description of what to find>\n\nFor raw JIT execution, write code to `.gm/exec-spool/in/<lang>/<N>.<ext>` (e.g. in/nodejs/42.js); the spool watcher executes it and writes out/<N>.json.');
      }
      if (input.tool === 'Skill') {
        const skill = ((input.args && input.args.skill) || '').toLowerCase().replace(/^gm:/,'');
        if (skill === 'explore' || skill === 'search') {
          throw new Error('The search/explore skill is blocked. Use exec:codesearch instead.\n\nexec:codesearch\n<natural language description>\n\nFor raw JIT execution, write code to `.gm/exec-spool/in/<lang>/<N>.<ext>` (e.g. in/nodejs/42.js); the spool watcher executes it and writes out/<N>.json.');
        }
      }
      if (input.tool === 'write' || input.tool === 'Write' || input.tool === 'edit' || input.tool === 'Edit') {
        const fp = (output.args && output.args.file_path) || (input.args && input.args.file_path) || '';
        const base = basename(fp).toLowerCase();
        const ext = extname(fp);
        const blocked = FORBIDDEN_FILE_RE.some(re => re.test(base)) || FORBIDDEN_PATH_RE.some(p => fp.includes(p))
          || (DOC_BLOCK_RE.test(ext) && !base.startsWith('claude') && !base.startsWith('agents') && !base.startsWith('readme') && !fp.includes('/skills/'));
        if (blocked) {
          throw new Error('Cannot create test/doc files. Use .prd for task notes, AGENTS.md for permanent notes.');
        }
      }
      if (input.tool !== 'bash' && input.tool !== 'Bash' && input.tool !== 'shell' && input.tool !== 'Shell' && input.tool !== 'spawn/exec') return;
      const cmd = (output.args && output.args.command) || '';
      if (!cmd) return;
      if (/^\s*(git|gh)(?:\s|$)/.test(cmd)) return;
      const m = cmd.match(/^exec(?::(\S+))?\s*\n([\s\S]+)$/);
      if (!m) {
        throw new Error('Use exec: prefix for Bash. The command must start with `exec` or `exec:<lang>` on its own line, then the body on the next line. Examples:\\n\\nexec\\nls -la\\n\\nexec:nodejs\\nconsole.log("hello")\\n\\nexec:bash\\ngit status\\n\\nLanguages: nodejs (default), bash, python, typescript, go, rust, deno, cmd. File I/O via exec:nodejs + require("fs"). Raw JIT execution can also bypass Bash entirely: write to `.gm/exec-spool/in/<lang>/<N>.<ext>` (e.g. in/nodejs/42.js) and the spool watcher executes it and writes `.gm/exec-spool/out/<N>.json`. Codebase search: exec:codesearch on its own line, then a two-word query.');
      }
      const rawLang = (m[1]||'').toLowerCase();
      if (rawLang === 'bash' || rawLang === 'sh' || rawLang === '') {
        const banned = bashBannedTool(m[2]);
        if (banned) throw new Error('`'+banned+'` is blocked in exec:bash. Use exec:codesearch instead. For raw JIT execution, write code to `.gm/exec-spool/in/<lang>/<N>.<ext>` (e.g. in/nodejs/42.js); the spool watcher executes it and writes out/<N>.json.');
      }
      const result = runExecSync(m[1]||'', m[2], output.args.workdir || directory);
      throw new Error('exec:'+(m[1]||'nodejs')+' output:\n\n'+result);
    },
    'message.updated': async (input, output) => {
      try {
        const role = input && input.message && input.message.info && input.message.info.role;
        if (role !== 'user') return;
        const gmDir = join(directory, '.gm');
        if (!existsSync(gmDir)) { try { require('fs').mkdirSync(gmDir, { recursive: true }); } catch(e) {} }
        try { writeFileSync(join(gmDir, 'needs-gm'), '1', 'utf-8'); } catch(e) {}
        try {
          const turnState = { turnId: Date.now(), firstToolFired: false, execCallsSinceMemorize: 0, recallFiredThisTurn: false };
          writeFileSync(join(gmDir, 'turn-state.json'), JSON.stringify(turnState), 'utf-8');
        } catch(e) {}
        try {
          const pausedPrd = join(gmDir, 'prd.paused.yml');
          const livePrd = join(gmDir, 'prd.yml');
          if (existsSync(pausedPrd) && !existsSync(livePrd)) {
            try { require('fs').renameSync(pausedPrd, livePrd); } catch(e) {}
          }
        } catch(e) {}
        runPlugkit(['hook', 'prompt-submit']);
      } catch(e) {}
    },
    'session.closing': async (input, output) => {
      try { runPlugkit(['hook', 'stop']); } catch(e) {}
      try { runPlugkit(['hook', 'stop-git']); } catch(e) {}
    },
  };
}
