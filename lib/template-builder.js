const fs = require('fs');
const path = require('path');

class TemplateBuilder {
  static loadSkillsFromSource(sourceDir, baseOutputPath = 'skills') {
    const skillsDir = path.join(sourceDir, 'skills');
    const skills = {};

    if (!fs.existsSync(skillsDir)) {
      return skills;
    }

    try {
      fs.readdirSync(skillsDir).forEach(skillName => {
        const skillPath = path.join(skillsDir, skillName);
        const stat = fs.statSync(skillPath);
        if (stat.isDirectory()) {
          const skillMdPath = path.join(skillPath, 'SKILL.md');
          if (fs.existsSync(skillMdPath)) {
            const content = fs.readFileSync(skillMdPath, 'utf-8');
            skills[`${baseOutputPath}/${skillName}/SKILL.md`] = content;
          }
        }
      });
    } catch (e) {}

    return skills;
  }

  static generatePackageJson(pluginSpec, adapterName, extraFields = {}) {
    return JSON.stringify({
      name: `${pluginSpec.name}-${adapterName}`,
      version: pluginSpec.version,
      description: pluginSpec.description,
      author: pluginSpec.author,
      license: pluginSpec.license,
      keywords: pluginSpec.keywords,
      repository: {
        type: 'git',
        url: `https://github.com/AnEntrypoint/${pluginSpec.name}-${adapterName}.git`
      },
      homepage: `https://github.com/AnEntrypoint/${pluginSpec.name}-${adapterName}#readme`,
      bugs: {
        url: `https://github.com/AnEntrypoint/${pluginSpec.name}-${adapterName}/issues`
      },
      engines: pluginSpec.engines,
      publishConfig: pluginSpec.publishConfig,
      ...extraFields
    }, null, 2);
  }

  static generateMcpJson(pluginSpec) {
    return JSON.stringify({
      $schema: 'https://schemas.modelcontextprotocol.io/0.1.0/mcp.json',
      mcpServers: pluginSpec.mcp
    }, null, 2);
  }

  static buildHooksMap(hookEventNames, hookOutputFormat = 'wrapped') {
    const hooks = {};
    const format = hookOutputFormat;

    if (format === 'bare') {
      hooks[hookEventNames.preTool] = this.createCommand('pre-tool-use-hook.js', 3600);
      hooks[hookEventNames.sessionStart] = this.createCommand('session-start-hook.js', 10000);
      hooks[hookEventNames.promptSubmit] = this.createCommand('prompt-submit-hook.js', 3600);
      hooks[hookEventNames.stop] = [
        this.createCommand('stop-hook.js', 300000),
        this.createCommand('stop-hook-git.js', 60000)
      ];
    } else {
      hooks[hookEventNames.preTool] = [
        {
          matcher: '*',
          hooks: [this.createCommand('pre-tool-use-hook.js', 3600)]
        }
      ];
      hooks[hookEventNames.sessionStart] = [
        {
          matcher: '*',
          hooks: [this.createCommand('session-start-hook.js', 10000)]
        }
      ];
      hooks[hookEventNames.promptSubmit] = [
        {
          matcher: '*',
          hooks: [this.createCommand('prompt-submit-hook.js', 3600)]
        }
      ];
      hooks[hookEventNames.stop] = [
        {
          matcher: '*',
          hooks: [
            this.createCommand('stop-hook.js', 300000),
            this.createCommand('stop-hook-git.js', 60000)
          ]
        }
      ];
    }

    return hooks;
  }

  static createCommand(hookFile, timeout) {
    return {
      type: 'command',
      command: `node \${GLOOTIE_ROOT}/${hookFile}`,
      timeout
    };
  }

  static buildHookCommandWithEnv(hookFile, envVar) {
    return `node \${${envVar}}/${hookFile}`;
  }
}

module.exports = TemplateBuilder;
