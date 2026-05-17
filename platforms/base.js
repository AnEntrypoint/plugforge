const path = require('path');
const fs = require('fs');
const { writeFile, ensureDir, copyFile } = require('../lib/file-generator');
const TemplateBuilder = require('../lib/template-builder');

class PlatformAdapter {
  constructor(config = {}) {
    this.name = config.name;
    this.label = config.label;
    this.configFile = config.configFile;
    this.contextFile = config.contextFile;
    this.tools = config.tools;
    this.env = config.env;
  }

  generate(pluginSpec, sourceDir, outputDir) {
    ensureDir(outputDir);
    const structure = this.createFileStructure(pluginSpec, sourceDir);
    const genericFiles = this.getGenericFilesToUse(this.name);
    const withGeneric = { ...genericFiles, ...structure };
    this.writeFiles(outputDir, withGeneric);
    this.copyBinaryFiles(sourceDir, outputDir);
  }

  copyBinaryFiles(sourceDir, outputDir) {
    const binDir = path.join(sourceDir, 'bin');
    if (!fs.existsSync(binDir)) {
      return;
    }
    const outputBinDir = path.join(outputDir, 'bin');
    ensureDir(outputBinDir);
    const entries = fs.readdirSync(binDir, { withFileTypes: true });
    entries.forEach(entry => {
      if (entry.isFile()) {
        const srcPath = path.join(binDir, entry.name);
        const dstPath = path.join(outputBinDir, entry.name);
        copyFile(srcPath, dstPath);
      }
    });
  }

  getGenericFilesToUse(platformName = null) {
    return TemplateBuilder.getCliGenericFiles(platformName);
  }

  createFileStructure(pluginSpec, sourceDir) {
    throw new Error('createFileStructure must be implemented by subclass');
  }

  writeFiles(outputDir, structure) {
    const written = [];
    Object.entries(structure).forEach(([filePath, content]) => {
      if (content) {
        writeFile(path.join(outputDir, filePath), content);
        written.push(filePath);
      }
    });
    return written;
  }

  generatePackageJson(pluginSpec, extraFields = {}) {
    return TemplateBuilder.generatePackageJson(pluginSpec, this.name, extraFields);
  }

  generateMcpJson(pluginSpec) {
    return TemplateBuilder.generateMcpJson(pluginSpec);
  }

  readSourceFile(sourceDir, paths) {
    const fs = require('fs');
    if (Array.isArray(paths)) {
      for (const p of paths) {
        const fullPath = path.join(sourceDir, p);
        try {
          return fs.readFileSync(fullPath, 'utf-8');
        } catch (e) {}
      }
      return null;
    }
    const fullPath = path.join(sourceDir, paths);
    try {
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (e) {
      return null;
    }
  }

  getAgentSourcePaths(agent) {
    return [`agents/${agent}.md`, `gm-${this.name}/agents/${agent}.md`, `gm-cc/agents/${agent}.md`];
  }

  getSkillSourcePath(skillName) {
    return `skills/${skillName}/SKILL.md`;
  }
}

module.exports = PlatformAdapter;
