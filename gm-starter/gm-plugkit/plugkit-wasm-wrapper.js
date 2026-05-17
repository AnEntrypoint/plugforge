import fs from 'fs';
import path from 'path';
import os from 'os';
import { watch } from 'fs';

function createWasiShim() {
  const shim = new Proxy({}, {
    get(target, prop) {
      if (prop === 'proc_exit') return (code) => process.exit(code);
      return () => 0;
    }
  });
  return shim;
}

function memWriteStr(memory, ptr, len, str) {
  const bytes = new TextEncoder().encode(str);
  const buf = new Uint8Array(memory.buffer, ptr, len);
  buf.set(bytes.slice(0, len));
  return Math.min(bytes.length, len);
}

function memReadStr(memory, ptr, len) {
  const buf = new Uint8Array(memory.buffer, ptr, len);
  return new TextDecoder().decode(buf);
}

let nextMemPtr = 0x10000;
function allocInMemory(memory, data) {
  const ptr = nextMemPtr;
  const buf = new Uint8Array(memory.buffer, ptr, data.length);
  buf.set(data);
  nextMemPtr += data.length;
  if (nextMemPtr > memory.buffer.byteLength - 4096) nextMemPtr = 0x10000;
  return { ptr, len: data.length };
}

function packResult(str) {
  const bytes = new TextEncoder().encode(str);
  const ptr = Math.random() * 0x100000 | 0;
  const len = bytes.length;
  return (BigInt(ptr) & 0xffffffffn) | (BigInt(len) << 32n);
}

async function runSpoolWatcher(instance, spoolDir) {
  const inDir = path.join(spoolDir, 'in');
  const outDir = path.join(spoolDir, 'out');
  fs.mkdirSync(inDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[plugkit-wasm] watching ${inDir}`);

  const processed = new Set();
  const dispatch = instance.exports.dispatch_verb;
  if (!dispatch) throw new Error('dispatch_verb not exported');

  const processFile = async (filePath) => {
    const key = path.relative(inDir, filePath);
    if (processed.has(key)) return;
    processed.add(key);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(inDir, filePath);
      const dir = path.dirname(relPath);
      const verb = dir === '.' ? path.basename(filePath, path.extname(filePath)) : dir;
      const body = content.trim() || '{}';

      const verbBytes = new TextEncoder().encode(verb);
      const bodyBytes = new TextEncoder().encode(body);

      const { ptr: verbPtr, len: verbLen } = allocInMemory(instance.exports.memory, verbBytes);
      const { ptr: bodyPtr, len: bodyLen } = allocInMemory(instance.exports.memory, bodyBytes);

      const result = dispatch(verbPtr, verbLen, bodyPtr, bodyLen);

      const ptr = Number(result & 0xffffffffn);
      const len = Number(result >> 32n);
      const resultStr = memReadStr(instance.exports.memory, ptr, len);

      const taskId = Math.random().toString(36).slice(2);
      fs.writeFileSync(path.join(outDir, `${taskId}.json`), resultStr);

      fs.unlinkSync(filePath);
      processed.delete(key);
    } catch (e) {
      console.error(`[plugkit-wasm] error processing ${key}: ${e.message}`);
      try { fs.unlinkSync(filePath); } catch (_) {}
      processed.delete(key);
    }
  };

  function walkDir(dir) {
    const files = [];
    try {
      for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          files.push(fullPath);
        } else if (stat.isDirectory()) {
          files.push(...walkDir(fullPath));
        }
      }
    } catch (e) {
      console.error(`[plugkit-wasm] error walking ${dir}: ${e.message}`);
    }
    return files;
  }

  const existing = walkDir(inDir);
  for (const fullPath of existing) {
    await processFile(fullPath);
  }

  let debounce = {};
  watch(inDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const fullPath = path.join(inDir, filename);

    clearTimeout(debounce[fullPath]);
    debounce[fullPath] = setTimeout(async () => {
      try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          await processFile(fullPath);
        }
      } catch (_) {}
      delete debounce[fullPath];
    }, 50);
  });

  console.log('[plugkit-wasm] spool watcher running');
  await new Promise(() => {});
}

(async () => {
  try {
    const wasmPath = path.join(os.homedir(), '.claude', 'gm-tools', 'plugkit.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmModule = new WebAssembly.Module(wasmBuffer);

    const memory = new WebAssembly.Memory({ initial: 256, maximum: 512 });

    const hostFunctions = {
      host_fs_read: () => 0,
      host_fs_write: () => 0,
      host_fs_readdir: () => 0,
      host_fs_stat: () => 0,
      host_kv_get: () => 0,
      host_kv_put: () => 0,
      host_kv_query: () => 0,
      host_fetch: () => 0,
      host_vec_search: () => 0,
      host_vec_embed: () => 0,
      host_browser_spawn: () => 0,
      host_browser_eval: () => 0,
      host_browser_close: () => 0,
      host_exec_js: () => 0,
      host_log: (ptr, len) => { console.log('[host_log]'); return 0; },
      host_now_ms: () => BigInt(Date.now()),
      host_env_get: () => 0,
    };

    const importObject = {
      env: { memory, ...hostFunctions },
      wasi_snapshot_preview1: createWasiShim(),
    };

    const instance = new WebAssembly.Instance(wasmModule, importObject);

    const args = process.argv.slice(2);
    if (args.includes('--version')) {
      console.log('plugkit v0.1.366 (wasm)');
      process.exit(0);
    }

    if (args[0] === 'spool') {
      const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      const spoolDir = path.join(projectDir, '.gm', 'exec-spool');
      await runSpoolWatcher(instance, spoolDir);
    } else {
      console.log('[plugkit-wasm] args:', args.join(' '));
      process.exit(0);
    }
  } catch (e) {
    console.error('[plugkit-wasm] fatal:', e.message);
    if (process.env.DEBUG) console.error(e.stack);
    process.exit(1);
  }
})();
