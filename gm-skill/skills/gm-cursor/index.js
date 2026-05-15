module.exports = {
  name: 'gm-cursor',
  description: 'Cursor editor platform adapter marker skill',
  async execute(context) {
    return { ok: true, message: 'gm-cursor platform marker', platform: 'gm-cursor' };
  }
};
