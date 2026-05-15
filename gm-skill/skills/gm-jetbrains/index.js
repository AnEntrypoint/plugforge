module.exports = {
  name: 'gm-jetbrains',
  description: 'JetBrains platform adapter marker skill',
  async execute(context) {
    return { ok: true, message: 'gm-jetbrains platform marker', platform: 'gm-jetbrains' };
  }
};
