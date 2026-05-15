const path = require('path');
const fs = require('fs');
const manifest = require('./manifest.js');

function loadSkill(skillName, skillPath) {
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Skill path does not exist: ${skillPath}`);
  }

  const indexPath = path.join(skillPath, 'index.js');
  if (!fs.existsSync(indexPath)) {
    // Some skills only have SKILL.md (reference docs), no index.js
    // That's ok - they're resolved at build time into platform packages
    return null;
  }

  try {
    const skillModule = require(indexPath);
    return skillModule;
  } catch (e) {
    throw new Error(`Failed to load skill ${skillName} from ${indexPath}: ${e.message}`);
  }
}

function dynamicLoadSkill(skillName, baseDir) {
  // Primary search order:
  // 1. Explicit baseDir (for platform overrides)
  // 2. Local gm-skill/skills/
  // 3. gm-starter/skills/ (full library)
  // 4. Current working directory
  // 5. Platform-specific build directories

  const searchDirs = [];

  if (baseDir) {
    searchDirs.push(path.join(baseDir, 'skills', skillName));
  }

  searchDirs.push(path.join(__dirname, '..', 'skills', skillName));
  searchDirs.push(path.join(__dirname, '..', '..', 'gm-starter', 'skills', skillName));

  // Also check platform-specific locations
  const platformSkills = path.join(__dirname, '..', '..', 'platforms');
  if (fs.existsSync(platformSkills)) {
    searchDirs.push(path.join(platformSkills, skillName));
  }

  searchDirs.push(path.join(process.cwd(), 'skills', skillName));
  searchDirs.push(path.join(process.cwd(), 'gm-starter', 'skills', skillName));

  for (const searchDir of searchDirs) {
    if (fs.existsSync(searchDir)) {
      const loaded = loadSkill(skillName, searchDir);
      if (loaded) return loaded;
    }
  }

  throw new Error(`Skill "${skillName}" not found in any search directory: ${searchDirs.join(', ')}`);
}

function getSkillPath(skillName, baseDir) {
  const searchDirs = [];

  if (baseDir) {
    searchDirs.push(path.join(baseDir, 'skills', skillName));
  }

  searchDirs.push(path.join(__dirname, '..', 'skills', skillName));
  searchDirs.push(path.join(__dirname, '..', '..', 'gm-starter', 'skills', skillName));

  const platformSkills = path.join(__dirname, '..', '..', 'platforms');
  if (fs.existsSync(platformSkills)) {
    searchDirs.push(path.join(platformSkills, skillName));
  }

  searchDirs.push(path.join(process.cwd(), 'skills', skillName));

  for (const searchDir of searchDirs) {
    if (fs.existsSync(searchDir)) {
      return searchDir;
    }
  }

  return null;
}

// Resolve a skill by name, returning the module or a { name, description, stub: true } object
// for reference-only skills that don't have an index.js.
function resolveSkill(skillName, baseDir) {
  try {
    return dynamicLoadSkill(skillName, baseDir);
  } catch {
    const md = manifest.getSkill(skillName);
    return {
      name: skillName,
      description: md.description,
      stub: true,
      manifest: md
    };
  }
}

module.exports = {
  loadSkill,
  dynamicLoadSkill,
  getSkillPath,
  resolveSkill
};