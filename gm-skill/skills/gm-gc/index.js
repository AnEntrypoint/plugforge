module.exports = {
  name: 'gm-gc',
  description: 'Cursor platform adapter marker skill',
  async execute(context) {
    return { ok: true, message: 'gm-gc platform marker', platform: 'gm-gc' };
  }
};
