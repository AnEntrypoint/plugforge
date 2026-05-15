module.exports = {
  name: 'gm-oc',
  description: 'OpenCode platform adapter marker skill',
  async execute(context) {
    return { ok: true, message: 'gm-oc platform marker', platform: 'gm-oc' };
  }
};
