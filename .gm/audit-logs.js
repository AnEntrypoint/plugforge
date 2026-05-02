const fs = require('fs');
const path = require('path');

const logDir = '/c/Users/user/.claude/gm-log/2026-05-02';
const subsystems = [
  'bootstrap', 'exec', 'hook', 'plugkit', 'plugkit_wrapper',
  'rs_codeinsight', 'rs_learn', 'rs_search'
];

const now = Date.now();
const oneHourAgo = now - (60 * 60 * 1000);

const results = {};

for (const subsystem of subsystems) {
  const filePath = path.join(logDir, `${subsystem}.jsonl`);
  if (!fs.existsSync(filePath)) {
    results[subsystem] = { event_count: 0, error_count: 0 };
    continue;
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n').filter(l => l.trim());

    const latencies = [];
    let errorCount = 0;
    let eventCount = 0;
    const errorPatterns = {};

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : 0;

        if (ts >= oneHourAgo && ts <= now) {
          eventCount++;

          if (entry.latency_ms !== undefined) {
            latencies.push(entry.latency_ms);
          }

          if (entry.severity === 'error' || entry.level === 'error') {
            errorCount++;
            const pattern = entry.error || entry.message || 'unknown';
            errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    const avgLatency = latencies.length > 0
      ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)
      : null;

    const errorRate = eventCount > 0
      ? ((errorCount / eventCount) * 100).toFixed(2)
      : '0.00';

    const topErrors = Object.entries(errorPatterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));

    results[subsystem] = {
      event_count: eventCount,
      error_count: errorCount,
      error_rate: parseFloat(errorRate),
      avg_latency_ms: avgLatency ? parseFloat(avgLatency) : null,
      latency_p50_ms: latencies.length > 0 ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.5)] : null,
      latency_p99_ms: latencies.length > 0 ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)] : null,
      top_error_patterns: topErrors
    };
  } catch (e) {
    console.error(`Error reading ${subsystem}: ${e.message}`);
    results[subsystem] = { event_count: 0, error_count: 0, error: e.message };
  }
}

console.log(JSON.stringify({
  window: {
    start: new Date(oneHourAgo).toISOString(),
    end: new Date(now).toISOString(),
    duration_minutes: 60
  },
  subsystems: results,
  summary: {
    total_events: Object.values(results).reduce((s, r) => s + (r.event_count || 0), 0),
    total_errors: Object.values(results).reduce((s, r) => s + (r.error_count || 0), 0),
    healthy_subsystems: Object.keys(results).filter(k => results[k].event_count > 0).length
  }
}, null, 2));
