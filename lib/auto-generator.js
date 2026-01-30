const fs = require('fs');
const path = require('path');
const ConventionLoader = require('./convention-loader');
const { config: cliConfig, createAdapterClass } = require('../platforms/cli-platforms');

const PLATFORMS = {
  'cc': () => createAdapterClass(cliConfig[0]),
  'gc': () => createAdapterClass(cliConfig[1]),
  'oc': () => createAdapterClass(cliConfig[2]),
  'codex': () => createAdapterClass(cliConfig[3]),
  'vscode': () => require('../platforms/vscode'),
  'cursor': () => require('../platforms/cursor'),
  'zed': () => require('../platforms/zed'),
  'jetbrains': () => require('../platforms/jetbrains'),
  'copilot-cli': () => require('../platforms/copilot-cli')
};

class AutoGenerator {
  constructor(pluginDir, outputDir) {
    this.pluginDir = pluginDir;
    this.outputDir = outputDir;
    this.loaded = null;
    this.results = {};
  }

  async generate() {
    this.loaded = ConventionLoader.load(this.pluginDir);

    const validation = ConventionLoader.validate(this.loaded);
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
    }

    this.ensureDir(this.outputDir);
    this.results = {};

    for (const [platformName, AdapterFactory] of Object.entries(PLATFORMS)) {
      try {
        const platformDir = path.join(this.outputDir, `glootie-${platformName}`);
        const AdapterClass = AdapterFactory();
        const adapter = new AdapterClass();

        this.cleanBuildDir(platformDir);
        adapter.generate(this.loaded.spec, this.pluginDir, platformDir);

        this.results[platformName] = {
          success: true,
          platform: platformName,
          dir: platformDir,
          files: this.getPlatformFiles(platformDir)
        };
      } catch (error) {
        this.results[platformName] = {
          success: false,
          platform: platformName,
          error: error.message,
          stack: error.stack
        };
      }
    }

    return this.results;
  }

  ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  cleanBuildDir(platformDir) {
    if (!fs.existsSync(platformDir)) return;
    const entries = fs.readdirSync(platformDir, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(platformDir, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    });
  }

  getPlatformFiles(platformDir) {
    const files = [];
    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        const relative = path.relative(platformDir, fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else {
          files.push(relative);
        }
      });
    };
    walk(platformDir);
    return files;
  }

  validateGeneratedFiles() {
    const validation = {};
    const requiredFilePatterns = {
      'package.json': { exact: true },
      'README.md': { exact: true },
      'agents/gm.md': { pattern: 'agents' },
      'skills': { pattern: 'skills' }
    };

    Object.keys(PLATFORMS).forEach(platform => {
      const result = this.results[platform];
      if (!result || !result.success) {
        validation[platform] = { status: 'failed', error: result?.error || 'No result' };
        return;
      }

      const files = result.files || [];
      const fileSet = new Set(files);
      const hasPackageJson = fileSet.has('package.json');
      const hasReadme = fileSet.has('README.md');
      const hasAgents = files.some(f => f.startsWith('agents/'));
      const hasSkills = files.some(f => f.startsWith('skills/'));

      const criticalFilesValid = hasPackageJson && hasReadme && hasAgents && hasSkills;
      validation[platform] = {
        status: criticalFilesValid ? 'valid' : 'missing-critical',
        fileCount: files.length,
        hasPackageJson,
        hasReadme,
        hasAgents,
        hasSkills
      };
    });
    return validation;
  }

  logResults() {
    const successful = Object.values(this.results).filter(r => r.success).length;
    const failed = Object.keys(PLATFORMS).length - successful;

    console.log('\nGeneration Results:');
    console.log('==================\n');

    Object.keys(PLATFORMS).forEach(platform => {
      const result = this.results[platform];
      if (result.success) {
        console.log(`✓ ${result.platform}: ${result.files.length} files`);
        result.files.slice(0, 3).forEach(f => console.log(`  - ${f}`));
        if (result.files.length > 3) {
          console.log(`  ... and ${result.files.length - 3} more`);
        }
      } else {
        console.log(`✗ ${result.platform}: ${result.error}`);
      }
    });

    console.log(`\nSummary: ${successful} succeeded, ${failed} failed\n`);

    if (failed > 0) {
      console.log('Failed platforms:');
      Object.keys(PLATFORMS).forEach(platform => {
        const result = this.results[platform];
        if (!result.success) {
          console.log(`  ${platform}: ${result.error}`);
        }
      });
      console.log('\nTo retry, fix errors and run build again.\n');
    }

    console.log('Output directories:');
    Object.keys(PLATFORMS).forEach(platform => {
      if (this.results[platform].success) {
        console.log(`  ${path.join(this.outputDir, `glootie-${platform}`)}`);
      }
    });
  }
}

module.exports = AutoGenerator;
