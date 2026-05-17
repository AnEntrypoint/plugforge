const CLIAdapter = require('../lib/cli-adapter');
const { cc: ccConfig, gc: gcConfig, oc: ocConfig, codex: codexConfig, kilo: kiloConfig, qwen: qwenConfig, hermes: hermesConfig, thebird: thebirdConfig } = require('./cli-config-shared');

const config = [ccConfig, gcConfig, ocConfig, codexConfig, kiloConfig, qwenConfig, hermesConfig, thebirdConfig];

function createAdapterClass(cfg) {
  class DynamicCLIAdapter extends CLIAdapter {
    constructor(options = {}) {
      super(cfg);
      this.shouldAlwaysGeneratePackageJson = !!cfg.generatePackageJson;
      this.skillsCache = options.skillsCache || null;
    }

    formatConfigJson(config, pluginSpec) {
      return cfg.formatConfigJson.call(this, config, pluginSpec);
    }

    getPackageJsonMain() {
      return cfg.getPackageJsonMain ? cfg.getPackageJsonMain() : 'cli.js';
    }

    getPackageJsonFields() {
      return cfg.getPackageJsonFields ? cfg.getPackageJsonFields() : { files: [] };
    }

    getAdditionalFiles(pluginSpec, readFile) {
      return cfg.getAdditionalFiles ? cfg.getAdditionalFiles(pluginSpec, readFile) : {};
    }

    generateReadme(pluginSpec) {
      return cfg.generateReadme ? cfg.generateReadme(pluginSpec) : super.generateReadme(pluginSpec);
    }

    generatePackageJson(pluginSpec, extraFields = {}) {
      return cfg.generatePackageJson ? cfg.generatePackageJson(pluginSpec, extraFields) : super.generatePackageJson(pluginSpec, extraFields);
    }

    loadSkillsFromSource(sourceDir) {
      if (this.skillsCache) {
        const skills = {};
        for (const [skillName, content] of this.skillsCache.entries()) {
          skills[`skills/${skillName}/SKILL.md`] = content;
        }
        return skills;
      }
      return cfg.loadSkillsFromSource ? cfg.loadSkillsFromSource(sourceDir) : super.loadSkillsFromSource(sourceDir);
    }

    loadLangFromSource(sourceDir) {
      return cfg.loadLangFromSource ? cfg.loadLangFromSource(sourceDir) : {};
    }

    transformAgentFrontmatter(raw) {
      return cfg.transformAgentFrontmatter ? cfg.transformAgentFrontmatter(raw) : raw;
    }
  }

  return DynamicCLIAdapter;
}

module.exports = { config, createAdapterClass };
