const PlatformAdapter = require('../platforms/base');
const path = require('path');
const fs = require('fs');
const TemplateBuilder = require('./template-builder');

class CLIAdapter extends PlatformAdapter {
  constructor(config = {}) {
    super(config);
    this.cliConfig = {
      hookEventNames: config.hookEventNames || {},
      hookOutputFormat: config.hookOutputFormat || 'wrapped',
      tools: config.tools || {},
      env: config.env || {}
    };
  }

  createFileStructure(pluginSpec, sourceDir) {
    const readFile = (paths) => this.readSourceFile(sourceDir, paths);
    const packageJsonSource = this.shouldAlwaysGeneratePackageJson ? null : readFile(['package.json']);
    const structure = {
      [this.configFile]: this.generateConfigJson(pluginSpec),
      '.mcp.json': this.generateMcpJson(pluginSpec),
      [this.contextFile]: '@AGENTS.md',
      'AGENTS.md': readFile(['AGENTS.md', 'CLAUDE.md']) || this.generateContextFile(),
      'README.md': this.generateReadme(pluginSpec),
      'package.json': packageJsonSource || this.generatePackageJson(pluginSpec, this.getPackageJsonFields()),
      'gm.json': readFile(['gm.json']),
      'index.html': TemplateBuilder.generateGitHubPage(TemplateBuilder.getPlatformPageConfig(this.name, pluginSpec)),
      ...this.getAdditionalFiles(pluginSpec, readFile)
    };
    Object.assign(structure, this.loadAgentsFromSource(sourceDir));
    const skills = this.loadSkillsFromSource(sourceDir);
    Object.assign(structure, skills);
    const scripts = this.loadScriptsFromSource(sourceDir);
    Object.assign(structure, scripts);
    const lang = this.loadLangFromSource(sourceDir);
    Object.assign(structure, lang);
    const prompts = this.loadPromptsFromSource(sourceDir);
    Object.assign(structure, prompts);
    const pk = this.loadGmPlugkitFromSource(sourceDir);
    Object.assign(structure, pk);
    const libFiles = this.loadLibFilesFromSource(sourceDir);
    Object.assign(structure, libFiles);
    return structure;
  }

  getPackageJsonFields() {
    return {
      main: this.getPackageJsonMain(),
      files: this.getPackageJsonFiles(),
      ...(this.getPeerDependencies && { peerDependencies: this.getPeerDependencies() })
    };
  }

  getPackageJsonMain() {
    return 'cli.js';
  }

  getPackageJsonFiles() {
    return [
      'agents/',
      'prompts/',
      'skills/',
      'scripts/',
      'lib/',
      '.github/',
      'README.md',
      this.contextFile,
      '.mcp.json',
      this.configFile,
      'cli.js',
      'index.html'
    ];
  }


  getAdditionalFiles(pluginSpec, readFile) {
    return {};
  }

  loadAgentsFromSource(sourceDir) {
    const agentsDir = path.join(sourceDir, 'agents');
    if (!fs.existsSync(agentsDir)) return {};
    return fs.readdirSync(agentsDir)
      .filter(f => f.endsWith('.md'))
      .reduce((acc, f) => {
        const raw = fs.readFileSync(path.join(agentsDir, f), 'utf-8');
        acc[`agents/${f}`] = this.transformAgentFrontmatter ? this.transformAgentFrontmatter(raw) : raw;
        return acc;
      }, {});
  }

  loadSkillsFromSource(sourceDir) {
    return TemplateBuilder.loadSkillsFromSource(sourceDir, 'skills');
  }

  loadPromptsFromSource(sourceDir) {
    const promptsDir = path.join(sourceDir, 'prompts');
    if (!fs.existsSync(promptsDir)) return {};
    return fs.readdirSync(promptsDir)
      .filter(f => f.endsWith('.txt'))
      .reduce((acc, f) => {
        acc[`prompts/${f}`] = fs.readFileSync(path.join(promptsDir, f), 'utf-8');
        return acc;
      }, {});
  }

  loadScriptsFromSource(sourceDir) {
    return TemplateBuilder.loadScriptsFromSource(sourceDir, 'scripts');
  }

  loadGmPlugkitFromSource(sourceDir) {
    const pkDir = path.join(sourceDir, 'gm-plugkit');
    if (!fs.existsSync(pkDir)) return {};
    const result = {};
    try {
      fs.readdirSync(pkDir).forEach(fileName => {
        const filePath = path.join(pkDir, fileName);
        if (fs.statSync(filePath).isFile()) {
          result[`gm-plugkit/${fileName}`] = fs.readFileSync(filePath, 'utf-8');
        }
      });
    } catch (e) {}
    return result;
  }

  loadLibFilesFromSource(sourceDir) {
    return TemplateBuilder.loadLibFilesFromSource(sourceDir, 'lib');
  }

  generateConfigJson(pluginSpec) {
    const config = {
      name: pluginSpec.name,
      version: pluginSpec.version,
      description: pluginSpec.description,
      author: pluginSpec.author,
      homepage: pluginSpec.homepage
    };
    return this.formatConfigJson(config, pluginSpec);
  }

  formatConfigJson(config, pluginSpec) {
    return JSON.stringify(config, null, 2);
  }


  generateContextFile() {
    return `# AGENTS

## Technical Notes

Dispatch via file-spool markers (not hooks):
- .gm/prd.yml — orchestration state
- .gm/mutables.yml — unknown resolution tracking
- .gm/needs-gm — marks when PRD requires orchestration run
- .gm/gm-fired-<id> — marks orchestration completion per session

Tool names for this platform: ${this.getToolNamesDescription()}

Session isolation: use SESSION_ID env var for per-session resource cleanup.

Verification file \`.gm-stop-verified\` is auto-added to .gitignore and tracks session completion state.
`;
  }

  getToolNamesDescription() {
    const toolMap = this.cliConfig.tools;
    const names = Object.entries(toolMap)
      .map(([generic, platform]) => `\`${generic}\` → \`${platform}\``)
      .join(', ');
    return names;
  }

  generateReadme(pluginSpec) {
    return `# ${pluginSpec?.name || 'gm'} for ${this.label}

Copy the directory to your ${this.label} extensions path and restart.

The extension activates automatically on session start.
`;
  }

  getGenericFilesToUse(platformName = null) {
    return TemplateBuilder.getCliGenericFiles(platformName);
  }
}

module.exports = CLIAdapter;
