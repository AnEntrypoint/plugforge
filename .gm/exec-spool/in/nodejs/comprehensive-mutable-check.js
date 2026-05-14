const fs = require('fs');
const path = require('path');

const results = {
  antigravity_skills: null,
  all_extensions_skills: null,
  gm_gc_exists: null,
  rs_learn_claudeclient: null
};

try {
  // Check antigravity skills
  const antigravityPath = '/c/dev/gm/build/gm-antigravity/skills';
  if (fs.existsSync(antigravityPath)) {
    const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
    const present = coreSkills.filter(skill =>
      fs.existsSync(path.join(antigravityPath, skill, 'SKILL.md'))
    );
    results.antigravity_skills = {
      present: present,
      all_4_present: present.length === 4
    };
  }

  // Check all 12 platform extensions
  const buildDir = '/c/dev/gm/build';
  const platforms = ['gm-cc', 'gm-gc', 'gm-oc', 'gm-kilo', 'gm-codex', 'gm-qwen', 'gm-copilot-cli', 'gm-hermes', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains'];
  const allPresent = [];
  const missing = [];

  for (const platform of platforms) {
    const skillsPath = path.join(buildDir, platform, 'skills');
    if (!fs.existsSync(skillsPath)) {
      missing.push(platform);
    } else {
      const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
      const present = coreSkills.filter(skill =>
        fs.existsSync(path.join(skillsPath, skill, 'SKILL.md'))
      );
      if (present.length === 4) {
        allPresent.push(platform);
      } else {
        missing.push(`${platform}(incomplete)`);
      }
    }
  }

  results.all_extensions_skills = {
    complete_platforms: allPresent,
    incomplete_or_missing: missing,
    all_12_complete: allPresent.length === 12
  };

  // Check gm-gc repo
  const gcPath = '/c/dev/gm-gc';
  results.gm_gc_exists = fs.existsSync(gcPath);

  // Check rs-learn for ClaudeCliClient
  const rsLearnPath = '/c/dev/rs-learn/src';
  if (fs.existsSync(rsLearnPath)) {
    const files = fs.readdirSync(rsLearnPath, { recursive: true })
      .filter(f => f.endsWith('.rs'))
      .map(f => path.join(rsLearnPath, f));

    const withClaudeClient = files.filter(f => {
      try {
        const content = fs.readFileSync(f, 'utf-8');
        return content.includes('ClaudeCliClient');
      } catch {
        return false;
      }
    });

    results.rs_learn_claudeclient = {
      files_with_claudeclient: withClaudeClient.length,
      needs_refactor: withClaudeClient.length > 0
    };
  }

  console.log(JSON.stringify(results, null, 2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
