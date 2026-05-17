const vscode = require('vscode');

let agents = {};

async function activate(context) {
  console.log('Windsurf extension activated');

  try {
    const gm = require('./gm.md');
    const codesearch = require('./codesearch.md');
    const websearch = require('./websearch.md');

    agents = { gm, codesearch, websearch };
    context.subscriptions.push(
      vscode.commands.registerCommand('windsurf.showAgents', () => {
        console.log('Available agents:', Object.keys(agents));
      })
    );
  } catch (e) {
    console.error('Failed to activate Windsurf extension:', e);
  }
}

function deactivate() {
  console.log('Windsurf extension deactivated');
}

module.exports = { activate, deactivate };
