const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BROWSER_API_HOST = '127.0.0.1';
const BROWSER_API_PORT = 5000;
const LOG_DIR = path.join(os.homedir(), '.claude', 'gm-log');
const SESSION_STATE_DIR = path.join(os.homedir(), '.gm', 'browser-sessions');

const sessionMap = new Map();

function emitBrowserEvent(severity, message, details) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logDir = path.join(LOG_DIR, date);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'browser.jsonl');
    const entry = {
      ts: new Date().toISOString(),
      severity,
      message,
      ...details,
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error(`[browser] Failed to emit event: ${e.message}`);
  }
}

function checkPortReachable(host, port, timeoutMs = 500) {
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

async function isBrowserAvailable() {
  return checkPortReachable(BROWSER_API_HOST, BROWSER_API_PORT, 1000);
}

function getSessionKey(sessionId) {
  return `session-${sessionId}`;
}

function loadSessionState(sessionId) {
  try {
    fs.mkdirSync(SESSION_STATE_DIR, { recursive: true });
    const stateFile = path.join(SESSION_STATE_DIR, `${sessionId}.json`);
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    emitBrowserEvent('warn', 'Failed to load session state', {
      sessionId,
      error: e.message,
    });
  }
  return { sessionId, createdAt: new Date().toISOString(), commands: [] };
}

function saveSessionState(sessionId, state) {
  try {
    fs.mkdirSync(SESSION_STATE_DIR, { recursive: true });
    const stateFile = path.join(SESSION_STATE_DIR, `${sessionId}.json`);
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (e) {
    emitBrowserEvent('warn', 'Failed to save session state', {
      sessionId,
      error: e.message,
    });
  }
}

async function sendCommandToApi(command, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeoutHandle = setTimeout(() => {
      socket.destroy();
      reject(new Error('Browser API request timeout'));
    }, timeout);

    let response = '';

    socket.connect(BROWSER_API_PORT, BROWSER_API_HOST, () => {
      const requestBody = JSON.stringify(command) + '\n';
      socket.write(requestBody);
    });

    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
    });

    socket.on('end', () => {
      clearTimeout(timeoutHandle);
      try {
        const result = JSON.parse(response);
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse browser API response: ${e.message}`));
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(new Error(`Browser API connection failed: ${err.message}`));
    });
  });
}

async function createSession(sessionId) {
  const startTime = Date.now();

  try {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    emitBrowserEvent('info', 'Creating session', { sessionId });

    const available = await isBrowserAvailable();
    if (!available) {
      throw new Error('Browser API unavailable at 127.0.0.1:5000');
    }

    const command = {
      action: 'create_session',
      sessionId,
    };

    const result = await sendCommandToApi(command);

    if (!result.ok) {
      throw new Error(result.error || 'Failed to create browser session');
    }

    const state = loadSessionState(sessionId);
    state.browserSessionId = result.sessionId;
    state.createdAt = new Date().toISOString();
    state.status = 'active';
    saveSessionState(sessionId, state);

    sessionMap.set(getSessionKey(sessionId), state);

    emitBrowserEvent('info', 'Session created', {
      sessionId,
      browserSessionId: result.sessionId,
      durationMs: Date.now() - startTime,
    });

    return {
      ok: true,
      sessionId,
      browserSessionId: result.sessionId,
    };
  } catch (e) {
    emitBrowserEvent('error', 'Session creation failed', {
      sessionId,
      error: e.message,
      durationMs: Date.now() - startTime,
    });
    throw e;
  }
}

async function sendCommand(sessionId, commandType, args) {
  const startTime = Date.now();

  try {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const state = loadSessionState(sessionId);
    if (!state.browserSessionId) {
      throw new Error(`No active session for ${sessionId}`);
    }

    emitBrowserEvent('info', 'Sending command', {
      sessionId,
      commandType,
      argsKeys: Object.keys(args || {}),
    });

    const available = await isBrowserAvailable();
    if (!available) {
      throw new Error('Browser API unavailable');
    }

    const command = {
      action: 'send_command',
      sessionId: state.browserSessionId,
      command: commandType,
      args: args || {},
    };

    const result = await sendCommandToApi(command);

    if (!result.ok) {
      throw new Error(result.error || `Failed to send ${commandType} command`);
    }

    state.commands = state.commands || [];
    state.commands.push({
      type: commandType,
      args,
      timestamp: new Date().toISOString(),
    });

    if (state.commands.length > 1000) {
      state.commands = state.commands.slice(-500);
    }

    saveSessionState(sessionId, state);

    emitBrowserEvent('info', 'Command sent', {
      sessionId,
      commandType,
      durationMs: Date.now() - startTime,
    });

    return {
      ok: true,
      result: result.data || result,
    };
  } catch (e) {
    emitBrowserEvent('error', 'Command failed', {
      sessionId,
      commandType,
      error: e.message,
      durationMs: Date.now() - startTime,
    });
    throw e;
  }
}

async function getScreenshot(sessionId) {
  try {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const state = loadSessionState(sessionId);
    if (!state.browserSessionId) {
      throw new Error(`No active session for ${sessionId}`);
    }

    emitBrowserEvent('info', 'Getting screenshot', { sessionId });

    const available = await isBrowserAvailable();
    if (!available) {
      throw new Error('Browser API unavailable');
    }

    const command = {
      action: 'screenshot',
      sessionId: state.browserSessionId,
    };

    const result = await sendCommandToApi(command, 30000);

    if (!result.ok) {
      throw new Error(result.error || 'Failed to get screenshot');
    }

    let screenshotData = result.data || result.screenshot || '';

    if (!screenshotData.startsWith('data:image')) {
      screenshotData = `data:image/png;base64,${screenshotData}`;
    }

    emitBrowserEvent('info', 'Screenshot retrieved', {
      sessionId,
      size: screenshotData.length,
    });

    return {
      ok: true,
      screenshot: screenshotData,
      mimeType: 'image/png',
    };
  } catch (e) {
    emitBrowserEvent('error', 'Screenshot failed', {
      sessionId,
      error: e.message,
    });
    throw e;
  }
}

async function closeSession(sessionId) {
  const startTime = Date.now();

  try {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    emitBrowserEvent('info', 'Closing session', { sessionId });

    const state = loadSessionState(sessionId);
    if (state.browserSessionId) {
      const available = await isBrowserAvailable();
      if (available) {
        const command = {
          action: 'close_session',
          sessionId: state.browserSessionId,
        };

        try {
          await sendCommandToApi(command, 5000);
        } catch (e) {
          emitBrowserEvent('warn', 'Failed to notify API of close', {
            sessionId,
            error: e.message,
          });
        }
      }
    }

    const stateFile = path.join(SESSION_STATE_DIR, `${sessionId}.json`);
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }

    sessionMap.delete(getSessionKey(sessionId));

    emitBrowserEvent('info', 'Session closed', {
      sessionId,
      durationMs: Date.now() - startTime,
    });

    return { ok: true, sessionId };
  } catch (e) {
    emitBrowserEvent('error', 'Session close failed', {
      sessionId,
      error: e.message,
      durationMs: Date.now() - startTime,
    });
    throw e;
  }
}

async function closeAllSessions(excludeSessionId = null) {
  try {
    if (!fs.existsSync(SESSION_STATE_DIR)) {
      return { ok: true, closed: 0 };
    }

    const files = fs.readdirSync(SESSION_STATE_DIR);
    let closed = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionId = file.replace('.json', '');
      if (excludeSessionId && sessionId === excludeSessionId) {
        continue;
      }

      try {
        await closeSession(sessionId);
        closed++;
      } catch (e) {
        emitBrowserEvent('warn', 'Failed to close session during cleanup', {
          sessionId,
          error: e.message,
        });
      }
    }

    emitBrowserEvent('info', 'All sessions closed', { closed });
    return { ok: true, closed };
  } catch (e) {
    emitBrowserEvent('error', 'Cleanup failed', { error: e.message });
    return { ok: false, error: e.message };
  }
}

module.exports = {
  createSession,
  sendCommand,
  getScreenshot,
  closeSession,
  closeAllSessions,
  isBrowserAvailable,
  loadSessionState,
  saveSessionState,
};
