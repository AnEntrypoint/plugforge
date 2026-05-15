module.exports = {
  name: 'gm-copilot-cli',
  description: 'Copilot CLI platform adapter marker skill',
  async execute(context) {
    return { ok: true, message: 'gm-copilot-cli platform marker', platform: 'gm-copilot-cli' };
  }
};
