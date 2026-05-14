const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');

const CODEINSIGHT_HOST = '127.0.0.1';
const CODEINSIGHT_PORT = 4802;
const LOG_DIR = path.join(os.homedir(), '.claude', 'gm-log');
const REQUEST_TIMEOUT_MS = 30000;

function emitEvent(severity, message, details = {}) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logDir = path.join(LOG_DIR, date);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'codeinsight.jsonl');
    const entry = {
      ts: new Date().toISOString(),
      severity,
      message,
      ...details,
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error(`[codeinsight] emit failed: ${e.message}`);
  }
}

async function checkSocketReachable(host = CODEINSIGHT_HOST, port = CODEINSIGHT_PORT, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeoutHandle = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);

    socket.connect(port, host, () => {
      clearTimeout(timeoutHandle);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeoutHandle);
      resolve(false);
    });
  });
}

async function sendRequest(request, sessionId = 'unknown') {
  const startTime = Date.now();
  const reachable = await checkSocketReachable();

  if (!reachable) {
    emitEvent('warn', 'Codeinsight socket unreachable', {
      host: CODEINSIGHT_HOST,
      port: CODEINSIGHT_PORT,
      sessionId,
      durationMs: Date.now() - startTime,
    });
    return {
      ok: false,
      error: `Codeinsight daemon unavailable at ${CODEINSIGHT_HOST}:${CODEINSIGHT_PORT}`,
      durationMs: Date.now() - startTime,
    };
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let buffer = '';
    let responseReceived = false;

    const timeoutHandle = setTimeout(() => {
      socket.destroy();
      if (!responseReceived) {
        emitEvent('warn', 'Codeinsight request timeout', {
          request: request.action,
          sessionId,
          durationMs: Date.now() - startTime,
        });
        resolve({
          ok: false,
          error: `Request timeout after ${REQUEST_TIMEOUT_MS}ms`,
          timedOut: true,
          durationMs: Date.now() - startTime,
        });
      }
    }, REQUEST_TIMEOUT_MS);

    socket.connect(CODEINSIGHT_PORT, CODEINSIGHT_HOST, () => {
      emitEvent('info', 'Connected to codeinsight daemon', {
        host: CODEINSIGHT_HOST,
        port: CODEINSIGHT_PORT,
        sessionId,
      });

      const requestLine = JSON.stringify(request) + '\n';
      socket.write(requestLine);
    });

    socket.on('data', (data) => {
      buffer += data.toString('utf8');

      const lines = buffer.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const response = JSON.parse(line);
          responseReceived = true;
          clearTimeout(timeoutHandle);
          socket.destroy();

          emitEvent('info', 'Codeinsight response received', {
            action: request.action,
            ok: response.ok,
            sessionId,
            durationMs: Date.now() - startTime,
          });

          resolve({
            ...response,
            durationMs: Date.now() - startTime,
          });
        } catch (e) {
          emitEvent('warn', 'Failed to parse codeinsight response', {
            action: request.action,
            error: e.message,
            sessionId,
          });
        }
      }

      buffer = lines[lines.length - 1];
    });

    socket.on('error', (err) => {
      clearTimeout(timeoutHandle);
      if (!responseReceived) {
        emitEvent('error', 'Codeinsight socket error', {
          action: request.action,
          error: err.message,
          sessionId,
          durationMs: Date.now() - startTime,
        });
        resolve({
          ok: false,
          error: `Socket error: ${err.message}`,
          durationMs: Date.now() - startTime,
        });
      }
    });

    socket.on('end', () => {
      if (!responseReceived) {
        clearTimeout(timeoutHandle);
        emitEvent('warn', 'Codeinsight socket closed without response', {
          action: request.action,
          sessionId,
          durationMs: Date.now() - startTime,
        });
        resolve({
          ok: false,
          error: 'Socket closed without response',
          durationMs: Date.now() - startTime,
        });
      }
    });
  });
}

async function searchCode(query, discipline = 'default', sessionId = 'unknown') {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    emitEvent('warn', 'Invalid search query', { discipline, sessionId });
    return {
      ok: false,
      error: 'Query must be a non-empty string',
    };
  }

  const request = {
    action: 'search',
    query: query.trim(),
    discipline,
    sessionId,
  };

  const result = await sendRequest(request, sessionId);

  if (result.ok) {
    emitEvent('info', 'Search completed', {
      query: query.trim(),
      discipline,
      resultCount: (result.results || []).length,
      sessionId,
      durationMs: result.durationMs,
    });
  }

  return result;
}

async function indexProject(projectPath, discipline = 'default', sessionId = 'unknown') {
  if (!projectPath || typeof projectPath !== 'string') {
    emitEvent('warn', 'Invalid project path', { discipline, sessionId });
    return {
      ok: false,
      error: 'Project path must be a non-empty string',
    };
  }

  if (!fs.existsSync(projectPath)) {
    emitEvent('warn', 'Project path does not exist', {
      projectPath,
      discipline,
      sessionId,
    });
    return {
      ok: false,
      error: `Project path does not exist: ${projectPath}`,
    };
  }

  const request = {
    action: 'index',
    projectPath: path.resolve(projectPath),
    discipline,
    sessionId,
  };

  const result = await sendRequest(request, sessionId);

  if (result.ok) {
    emitEvent('info', 'Index operation completed', {
      projectPath: path.resolve(projectPath),
      discipline,
      filesIndexed: result.filesIndexed,
      sessionId,
      durationMs: result.durationMs,
    });
  }

  return result;
}

async function getDiagnostics(projectPath = null, discipline = 'default', sessionId = 'unknown') {
  if (projectPath && !fs.existsSync(projectPath)) {
    emitEvent('warn', 'Diagnostics project path does not exist', {
      projectPath,
      discipline,
      sessionId,
    });
    return {
      ok: false,
      error: `Project path does not exist: ${projectPath}`,
    };
  }

  const request = {
    action: 'diagnostics',
    projectPath: projectPath ? path.resolve(projectPath) : null,
    discipline,
    sessionId,
  };

  const result = await sendRequest(request, sessionId);

  if (result.ok) {
    emitEvent('info', 'Diagnostics retrieved', {
      projectPath: projectPath ? path.resolve(projectPath) : 'system-wide',
      discipline,
      diagnosticCount: (result.diagnostics || []).length,
      sessionId,
      durationMs: result.durationMs,
    });
  }

  return result;
}

async function getIndexStatus(discipline = 'default', sessionId = 'unknown') {
  const request = {
    action: 'status',
    discipline,
    sessionId,
  };

  const result = await sendRequest(request, sessionId);

  if (result.ok) {
    emitEvent('info', 'Index status retrieved', {
      discipline,
      indexed: result.indexed,
      sessionId,
      durationMs: result.durationMs,
    });
  }

  return result;
}

module.exports = {
  searchCode,
  indexProject,
  getDiagnostics,
  getIndexStatus,
  checkSocketReachable,
};
