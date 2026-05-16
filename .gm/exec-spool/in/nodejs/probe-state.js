const fs = require('fs');
const path = require('path');

const state = {
  rs_plugkit: {
    hook_modules: [],
    wasm_target: false,
    ci_files: []
  },
  rs_exec: {
    bash_override: false,
    wasm_target: false
  },
  rs_learn: {
    provider: 'unknown',
    wasm_target: false
  },
  gm_starter: {
    hook_generation: false,
    spool_dispatch: false,
    wasm_bootstrap: false
  }
};

const dirs = {
  'C:\\dev\\rs-plugkit\\src\\hook': state.rs_plugkit.hook_modules,
  'C:\\dev\\rs-plugkit\\.github\\workflows': state.rs_plugkit.ci_files,
};

try {
  for (const [dir, target] of Object.entries(dirs)) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      console.log(`[${dir}] ${files.length} files`);
      console.log(files.map(f => `  - ${f}`).join('\n'));
    }
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
}

const checkFile = (p, desc) => {
  const exists = fs.existsSync(p);
  console.log(`${desc}: ${exists ? 'YES' : 'NO'}`);
  return exists;
};

console.log('\n=== Key files ===');
checkFile('C:\\dev\\gm\\.gm\\prd.yml', 'PRD exists');
checkFile('C:\\dev\\gm\\.gm\\mutables.yml', 'Mutables exist');
checkFile('C:\\dev\\acptoapi\\package.json', 'acptoapi local');
checkFile('C:\\dev\\rs-plugkit\\Cargo.toml', 'rs-plugkit source');
