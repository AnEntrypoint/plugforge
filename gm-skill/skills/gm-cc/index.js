module.exports = {
  name: 'gm-cc',
  description: 'Claude Code adapter marker skill',
  async execute(context) {
    return { ok: true, message: 'gm-cc platform marker', platform: 'gm-cc' };
  }
};
