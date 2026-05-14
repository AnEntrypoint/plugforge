const fs = require('fs');
const path = require('path');

function parseSkillMarkdown(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);

  if (!match) return {};

  const frontmatter = match[1];
  const metadata = {};

  frontmatter.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;

    const key = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();

    if (key === 'allowed-tools') {
      metadata.allowedTools = value
        .split(',')
        .map(t => t.trim().replace(/^['\"]|['\"]$/g, ''));
    } else {
      metadata[key] = value;
    }
  });

  return metadata;
}

function readSkillManifest(skillName) {
  const searchPaths = [
    path.join(__dirname, '..', 'skills', skillName, 'SKILL.md'),
    path.join(__dirname, '..', '..', 'gm-starter', 'skills', skillName, 'SKILL.md')
  ];

  let skillMdPath = null;
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      skillMdPath = p;
      break;
    }
  }

  if (!skillMdPath) {
    return {
      name: skillName,
      description: '',
      allowedTools: [],
      compatiblePlatforms: [],
      endToEnd: false,
      skillMdContent: ''
    };
  }

  const content = fs.readFileSync(skillMdPath, 'utf8');
  const metadata = parseSkillMarkdown(content);

  return {
    name: metadata.name || skillName,
    description: metadata.description || '',
    version: metadata.version || '1.0.0',
    category: metadata.category || 'skill',
    allowedTools: metadata.allowedTools || [],
    compatiblePlatforms: metadata['compatible-platforms']
      ? metadata['compatible-platforms'].split(',').map(p => p.trim())
      : [],
    endToEnd: metadata['end-to-end'] === 'true',
    skillMdContent: content
  };
}

function getManifest() {
  const skills = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete', 'update-docs'];
  return {
    name: 'gm-skill',
    version: '1.0.0',
    description: 'gm skill manifest and daemon bootstrap integration',
    skills: skills.map(name => readSkillManifest(name))
  };
}

function getSkill(name) {
  return readSkillManifest(name);
}

function getAllSkills() {
  const skills = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete', 'update-docs'];
  return skills.map(name => readSkillManifest(name));
}

module.exports = {
  getManifest,
  getSkill,
  getAllSkills,
  parseSkillMarkdown,
  readSkillManifest
};
