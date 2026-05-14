const http = require('http');

function testAcptoapi() {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: 4800,
      method: 'POST',
      timeout: 2000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          reachable: true,
          status_code: res.statusCode,
          response_preview: data.substring(0, 100)
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        reachable: false,
        error: e.message,
        note: 'acptoapi daemon may not be running (spawned by session_start hook)'
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        reachable: false,
        error: 'timeout',
        note: 'acptoapi socket exists but not responding'
      });
    });

    const testPayload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: [] });
    req.write(testPayload);
    req.end();
  });
}

testAcptoapi().then(result => {
  console.log(JSON.stringify({
    acptoapi_pure_api_contract: result,
    expectation: 'Runs as pure JSON-RPC provider with no filesystem access'
  }, null, 2));
});
