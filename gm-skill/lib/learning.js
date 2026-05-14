const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RS_LEARN_HOST = '127.0.0.1';
const RS_LEARN_PORT = 4801;
const LOG_DIR = path.join(os.homedir(), '.claude', 'gm-log');

let daemonBootstrap = null;
function getDaemonBootstrap() {
  if (!daemonBootstrap) {
    try {
      daemonBootstrap = require('./daemon-bootstrap.js');
    } catch (e) {
      console.error('[learning] Failed to load daemon-bootstrap:', e.message);
      return null;
    }
  }
  return daemonBootstrap;
}

let requestIdCounter = 1000;

function getRequestId() {
  return ++requestIdCounter;
}

function emitLearningEvent(action, severity, message, details = {}) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logDir = path.join(LOG_DIR, date);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'learning.jsonl');
    const entry = {
      ts: new Date().toISOString(),
      action,
      severity,
      message,
      ...details,
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error(`[learning] Failed to emit event: ${e.message}`);
  }
}

async function ensureDaemonRunning(sessionId = null) {
  const sid = sessionId || process.env.CLAUDE_SESSION_ID || 'unknown';
  const bootstrap = getDaemonBootstrap();

  if (!bootstrap) {
    emitLearningEvent('daemon', 'warn', 'daemon-bootstrap not available, skipping spawn', { sessionId: sid });
    return false;
  }

  try {
    const startTime = Date.now();
    const result = await bootstrap.ensureRsLearningDaemonRunning();
    emitLearningEvent('daemon', 'info', 'daemon spawn result', {
      sessionId: sid,
      ok: result.ok,
      already_running: result.already_running,
      durationMs: Date.now() - startTime,
    });
    return result.ok === true;
  } catch (error) {
    emitLearningEvent('daemon', 'warn', 'daemon spawn failed', {
      sessionId: sid,
      error: error.message,
    });
    return false;
  }
}

async function checkLearningAvailable(timeoutMs = 500) {
  const startTime = Date.now();
  const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeoutHandle = setTimeout(() => {
      socket.destroy();
      emitLearningEvent('check', 'warn', 'rs-learn unavailable (timeout)', { sessionId, timeoutMs });
      resolve(false);
    }, timeoutMs);

    socket.connect(RS_LEARN_PORT, RS_LEARN_HOST, () => {
      clearTimeout(timeoutHandle);
      socket.destroy();
      emitLearningEvent('check', 'info', 'rs-learn reachable', { sessionId, durationMs: Date.now() - startTime });
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeoutHandle);
      emitLearningEvent('check', 'warn', 'rs-learn connection failed', { sessionId, durationMs: Date.now() - startTime });
      resolve(false);
    });
  });
}

async function jsonRpcCall(method, params, sessionId, timeoutMs = 5000) {
  const requestId = getRequestId();
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';
    const timeoutHandle = setTimeout(() => {
      socket.destroy();
      emitLearningEvent('rpc', 'error', `RPC timeout: ${method}`, { sessionId, method, requestId, timeoutMs });
      reject(new Error(`RPC timeout after ${timeoutMs}ms for ${method}`));
    }, timeoutMs);

    socket.on('connect', () => {
      const payload = JSON.stringify({
        jsonrpc: '2.0',
        method,
        params: { ...params, sessionId },
        id: requestId,
      });

      emitLearningEvent('rpc', 'debug', `RPC call: ${method}`, { sessionId, method, requestId });
      socket.write(payload + '\n');
    });

    socket.on('data', (chunk) => {
      response += chunk.toString();

      try {
        const lines = response.split('\n').filter(l => l.trim());
        const lastLine = lines[lines.length - 1];

        if (lastLine.trim()) {
          const result = JSON.parse(lastLine);

          if (result.error) {
            clearTimeout(timeoutHandle);
            socket.destroy();
            emitLearningEvent('rpc', 'error', `RPC error: ${method}`, {
              sessionId,
              method,
              requestId,
              error: result.error.message,
              durationMs: Date.now() - startTime,
            });
            reject(new Error(`RPC error: ${result.error.message}`));
          } else if (result.result !== undefined) {
            clearTimeout(timeoutHandle);
            socket.destroy();
            emitLearningEvent('rpc', 'debug', `RPC success: ${method}`, {
              sessionId,
              method,
              requestId,
              durationMs: Date.now() - startTime,
            });
            resolve(result.result);
          }
        }
      } catch (e) {
        if (response.trim().length > 1000) {
          clearTimeout(timeoutHandle);
          socket.destroy();
          emitLearningEvent('rpc', 'error', `RPC response parse failed: ${method}`, {
            sessionId,
            method,
            error: e.message,
          });
          reject(e);
        }
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeoutHandle);
      emitLearningEvent('rpc', 'error', `RPC socket error: ${method}`, {
        sessionId,
        method,
        error: err.message,
      });
      reject(err);
    });

    socket.connect(RS_LEARN_PORT, RS_LEARN_HOST);
  });
}

async function queryLearning(query, discipline = 'default', sessionId = null) {
  const sid = sessionId || process.env.CLAUDE_SESSION_ID || 'unknown';
  const startTime = Date.now();

  try {
    emitLearningEvent('query', 'info', `Learning query: ${query}`, { sessionId: sid, query, discipline });

    const available = await checkLearningAvailable();
    if (!available) {
      emitLearningEvent('query', 'warn', 'Learning unavailable', { sessionId: sid, query });
      return null;
    }

    const result = await jsonRpcCall(
      'recall',
      { query, discipline },
      sid,
      5000
    );

    emitLearningEvent('query', 'info', 'Learning query completed', {
      sessionId: sid,
      query,
      discipline,
      hitCount: Array.isArray(result) ? result.length : 0,
      durationMs: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    emitLearningEvent('query', 'error', `Learning query failed: ${query}`, {
      sessionId: sid,
      query,
      error: error.message,
      durationMs: Date.now() - startTime,
    });
    return null;
  }
}

async function persistLearning(fact, discipline = 'default', sessionId = null) {
  const sid = sessionId || process.env.CLAUDE_SESSION_ID || 'unknown';
  const startTime = Date.now();

  try {
    emitLearningEvent('persist', 'info', 'Learning persist initiated', { sessionId: sid, discipline, factLength: fact.length });

    const available = await checkLearningAvailable();
    if (!available) {
      emitLearningEvent('persist', 'error', 'Learning unavailable for persist', { sessionId: sid, discipline });
      throw new Error('rs-learn daemon not available');
    }

    const result = await jsonRpcCall(
      'memorize',
      { fact, discipline },
      sid,
      5000
    );

    emitLearningEvent('persist', 'info', 'Learning persist completed', {
      sessionId: sid,
      discipline,
      durationMs: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    emitLearningEvent('persist', 'error', `Learning persist failed: ${error.message}`, {
      sessionId: sid,
      discipline,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}

module.exports = {
  checkLearningAvailable,
  queryLearning,
  persistLearning,
  ensureDaemonRunning,
  RS_LEARN_HOST,
  RS_LEARN_PORT,
};
