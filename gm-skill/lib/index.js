const daemon = require('./daemon-bootstrap.js');
const manifest = require('./manifest.js');
const loader = require('./loader.js');
const prepareModule = require('./prepare.js');
const spool = require('./spool.js');
const learning = require('./learning.js');
const codeinsight = require('./codeinsight.js');
const browser = require('./browser.js');
const git = require('./git.js');
const hooks = require('./hook-bridge.js');

function getSkills() {
  return manifest.getAllSkills();
}

function getSkill(name) {
  return manifest.getSkill(name);
}

function loadSkill(skillName, baseDir) {
  return loader.dynamicLoadSkill(skillName, baseDir);
}

function bootstrapDaemon(daemonName, cmd) {
  return daemon.spawnDaemon(daemonName, cmd);
}

module.exports = {
  getSkills: getSkills,
  getSkill: getSkill,
  loadSkill: loadSkill,
  bootstrapDaemon: bootstrapDaemon,
  checkState: daemon.checkState,
  waitForReady: daemon.waitForReady,
  getSocket: daemon.getSocket,
  shutdown: daemon.shutdown,
  emitEvent: daemon.emitEvent,
  isDaemonRunning: daemon.isDaemonRunning,
  checkPortReachable: daemon.checkPortReachable,
  manifest: manifest,
  loader: loader,
  prepare: prepareModule.prepare,
  spool: spool,
  learning: learning,
  codeinsight: codeinsight,
  browser: browser,
  git: git,
  hooks: hooks
};
