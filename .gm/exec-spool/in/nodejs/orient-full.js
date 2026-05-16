const fs = require('fs');
const path = require('path');

const result = {
  repos: {},
  platform_state: {},
  spool_state: {},
  learning_state: {},
  wasm_state: {}
};

// Check rs-plugkit hook modules
try {
  const hookDir = 'C:\\dev\\rs-plugkit\\src\\hook';
  if (fs.existsSync(hookDir)) {
    result.repos.rs_plugkit = {
      hook_files: fs.readdirSync(hookDir),
      has_cargo: fs.existsSync('C:\\dev\\rs-plugkit\\Cargo.toml'),
      has_wasm_target: fs.existsSync('C:\\dev\\rs-plugkit\\Cargo.toml') &&
        fs.readFileSync('C:\\dev\\rs-plugkit\\Cargo.toml', 'utf-8').includes('wasm32-unknown-unknown')
    };
  }
} catch (e) {
  result.repos.rs_plugkit = { error: e.message };
}

// Check rs-exec
try {
  const src = 'C:\\dev\\rs-exec\\src';
  if (fs.existsSync(src)) {
    const files = fs.readdirSync(src);
    result.repos.rs_exec = {
      src_files: files.slice(0, 10),
      has_cargo: fs.existsSync('C:\\dev\\rs-exec\\Cargo.toml'),
      bash_override_refs: 0
    };
  }
} catch (e) {
  result.repos.rs_exec = { error: e.message };
}

// Check rs-learn provider
try {
  const cargo = 'C:\\dev\\rs-learn\\Cargo.toml';
  if (fs.existsSync(cargo)) {
    const content = fs.readFileSync(cargo, 'utf-8');
    result.repos.rs_learn = {
      has_openai_key: content.includes('OPENAI_API_KEY'),
      has_bun_spawn: content.includes('Command::new("bun"'),
      has_acptoapi: content.includes('acptoapi') || content.includes('acp-sdk'),
      has_cargo: true
    };
  }
} catch (e) {
  result.repos.rs_learn = { error: e.message };
}

// Check gm-starter lib
try {
  const libDir = 'C:\\dev\\gm\\gm-starter\\lib';
  if (fs.existsSync(libDir)) {
    result.repos.gm_starter = {
      lib_files: fs.readdirSync(libDir),
      has_hook_generation: fs.readdirSync(libDir).some(f => f.includes('hook'))
    };
  }
} catch (e) {
  result.repos.gm_starter = { error: e.message };
}

// Check platform generation
try {
  const platforms = 'C:\\dev\\gm\\platforms';
  if (fs.existsSync(platforms)) {
    result.platform_state.platform_count = fs.readdirSync(platforms).filter(f => f.startsWith('cli-')).length;
    result.platform_state.has_hook_spec = fs.readdirSync(platforms).some(f => f.includes('hook'));
  }
} catch (e) {
  result.platform_state.error = e.message;
}

// Check spool state
try {
  const spool = 'C:\\dev\\gm\\.gm\\exec-spool';
  if (fs.existsSync(spool)) {
    result.spool_state.exists = true;
    result.spool_state.dirs = fs.readdirSync(spool);
    const out = path.join(spool, 'out');
    if (fs.existsSync(out)) {
      result.spool_state.out_files = fs.readdirSync(out).length;
    }
  }
} catch (e) {
  result.spool_state.error = e.message;
}

// Check acptoapi
try {
  const acptoapi = 'C:\\dev\\acptoapi';
  if (fs.existsSync(acptoapi)) {
    result.learning_state.acptoapi_exists = true;
    result.learning_state.acptoapi_package = fs.existsSync(path.join(acptoapi, 'package.json'));
  }
} catch (e) {
  result.learning_state.error = e.message;
}

// Check AGENTS.md
try {
  const agents = 'C:\\dev\\gm\\AGENTS.md';
  if (fs.existsSync(agents)) {
    const content = fs.readFileSync(agents, 'utf-8');
    result.learning_state.agents_md_size = content.length;
    result.learning_state.agents_md_has_hook_refs = content.includes('hook');
  }
} catch (e) {
  result.learning_state.agents_error = e.message;
}

console.log(JSON.stringify(result, null, 2));
