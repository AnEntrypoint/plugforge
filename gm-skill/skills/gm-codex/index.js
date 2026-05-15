module.exports = {
  name: 'gm-codex',
  description: 'Codex platform adapter marker skill',
  async execute(context) {
    return { ok: true, message: 'gm-codex platform marker', platform: 'gm-codex' };
  }
};
