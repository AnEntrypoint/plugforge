const fs = require('fs');
const path = require('path');

const skillPath = path.join(process.cwd(), 'gm-starter/skills/gm/SKILL.md');
const content = fs.readFileSync(skillPath, 'utf8');

const lines = content.split(/\r\n|\n/);
const frontmatterStart = lines.findIndex(l => l.trim().startsWith('---'));
const frontmatterEnd = lines.findIndex((l, i) => i > 0 && l.trim().startsWith('---'));

console.log(`[format-witness] SKILL.md structure check`);
console.log(`[format-witness] Frontmatter starts at line ${frontmatterStart + 1}`);
console.log(`[format-witness] Frontmatter ends at line ${frontmatterEnd + 1}`);

if (frontmatterStart >= 0 && frontmatterEnd > frontmatterStart) {
  const frontmatter = lines.slice(frontmatterStart + 1, frontmatterEnd).join('\n');
  console.log(`[format-witness] Frontmatter:\n${frontmatter}`);

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const toolsMatch = frontmatter.match(/^allowed-tools:\s*(.+)$/m);

  console.log(`\n[format-witness] Parsed fields:`);
  console.log(`  name: ${nameMatch ? nameMatch[1] : 'NOT FOUND'}`);
  console.log(`  description: ${descMatch ? descMatch[1].substring(0, 80) : 'NOT FOUND'}`);
  console.log(`  allowed-tools: ${toolsMatch ? toolsMatch[1] : 'NOT FOUND'}`);
}

console.log(`\n✓ Format verification complete`);
