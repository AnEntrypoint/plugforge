module.exports = {
  name: 'gm-zed',
  description: 'Zed editor platform adapter marker skill',
  async execute(context) {
    return { ok: true, message: 'gm-zed platform marker', platform: 'gm-zed' };
  }
};
