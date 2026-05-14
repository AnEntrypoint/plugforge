const path = require('path');
const fs = require('fs');

function loadSkill(skillName, skillPath) {
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Skill path does not exist: ${skillPath}`);
  }

  const indexPath = path.join(skillPath, 'index.js');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Skill index.js not found at ${indexPath}`);
  }

  try {
    const skillModule = require(indexPath);
    return skillModule;
  } catch (e) {
    throw new Error(`Failed to load skill ${skillName} from ${indexPath}: ${e.message}`);
  }
}

function dynamicLoadSkill(skillName, baseDir) {
  const searchDirs = [];

  if (baseDir) {
    searchDirs.push(path.join(baseDir, 'skills', skillName));
  }

  searchDirs.push(path.join(__dirname, '..', 'skills', skillName));
  searchDirs.push(path.join(__dirname, '..', '..', 'gm-starter', 'skills', skillName));
  searchDirs.push(path.join(process.cwd(), 'skills', skillName));

  for (const searchDir of searchDirs) {
    if (fs.existsSync(searchDir)) {
      return loadSkill(skillName, searchDir);
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
  searchDirs.push(path.join(process.cwd(), 'skills', skillName));

  for (const searchDir of searchDirs) {
    if (fs.existsSync(searchDir)) {
      return searchDir;
    }
  }

  return null;
}

module.exports = {
  loadSkill,
  dynamicLoadSkill,
  getSkillPath
};
