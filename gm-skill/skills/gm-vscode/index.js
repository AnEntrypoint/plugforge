module.exports = {
  name: 'gm-vscode',
  description: 'VS Code platform adapter marker skill',
  async execute(context) {
    return { ok: true, message: 'gm-vscode platform marker', platform: 'gm-vscode' };
  }
};
