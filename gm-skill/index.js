const daemonBootstrap = require('../gm-starter/lib/daemon-bootstrap.js');
const spool = require('../gm-starter/lib/spool.js');
const manifest = require('./lib/manifest.js');

module.exports = {
  ...daemonBootstrap,
  spool,
  manifest
};
