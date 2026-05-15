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
        .map(t => t.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      metadata[key] = value;
    }
  });

  return metadata;
}

function readSkillManifest(skillName, searchDirs) {
  let skillMdPath = null;
  for (const dir of searchDirs) {
    const p = path.join(dir, skillName, 'SKILL.md');
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

// All skills required for full parity across platforms
const ALL_SKILLS = [
  'gm',
  'planning',
  'gm-execute',
  'gm-emit',
  'gm-complete',
  'update-docs',
  'gm-cc',
  'gm-gc',
  'gm-codex',
  'gm-copilot-cli',
  'gm-cursor',
  'gm-jetbrains',
  'gm-kilo',
  'gm-oc',
  'gm-vscode',
  'gm-zed',
  'code-search',
  'browser',
  'ssh',
  'pages',
  'governance',
  'create-lang-plugin',
  'textprocessing',
  'research',
];

function getManifest() {
  const searchPaths = [
    path.join(__dirname, '..', 'skills'),
    path.join(__dirname, '..', '..', 'gm-starter', 'skills'),
  ];

  const skills = ALL_SKILLS.map(name => readSkillManifest(name, searchPaths));

  return {
    name: 'gm-skill',
    version: '1.0.0',
    description: 'Full gm skill library with platform parity - includes all skills from gm-cc and gm-starter',
    skills
  };
}

function getSkill(name) {
  const searchPaths = [
    path.join(__dirname, '..', 'skills'),
    path.join(__dirname, '..', '..', 'gm-starter', 'skills'),
  ];
  return readSkillManifest(name, searchPaths);
}

function getAllSkills() {
  const searchPaths = [
    path.join(__dirname, '..', 'skills'),
    path.join(__dirname, '..', '..', 'gm-starter', 'skills'),
  ];
  return ALL_SKILLS.map(name => readSkillManifest(name, searchPaths));
}

function getSkillNames() {
  return ALL_SKILLS;
}

module.exports = {
  getManifest,
  getSkill,
  getAllSkills,
  getSkillNames,
  parseSkillMarkdown,
  readSkillManifest
};