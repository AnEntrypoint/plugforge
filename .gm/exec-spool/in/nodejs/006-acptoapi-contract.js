const http = require('http');

console.log('Testing acptoapi pure API contract...\n');

function checkAcptoapi() {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: 4800,
      method: 'GET',
      timeout: 1000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          reachable: true,
          status_code: res.statusCode,
          headers: res.headers
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        reachable: false,
        error: e.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        reachable: false,
        error: 'timeout'
      });
    });

    req.end();
  });
}

checkAcptoapi().then(result => {
  console.log(JSON.stringify({
    acptoapi_socket_status: result,
    pure_api_expected: 'listens on 127.0.0.1:4800, accepts JSON-RPC',
    note: 'acptoapi spawned by session_start hook if not already running'
  }, null, 2));
});
