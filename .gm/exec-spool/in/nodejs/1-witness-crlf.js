const fs = require('fs');
const path = require('path');

const skillPath = path.join(process.cwd(), 'gm-starter/skills/gm-execute/SKILL.md');
const content = fs.readFileSync(skillPath, 'utf8');
const bytes = fs.readFileSync(skillPath);

const hasCRLF = content.includes('\r\n');
const hasLF = content.includes('\n') && !hasCRLF;

console.log(`[crlf-bug-check] File: ${skillPath}`);
console.log(`[crlf-bug-check] Has CRLF: ${hasCRLF}`);
console.log(`[crlf-bug-check] Has LF only: ${hasLF}`);
console.log(`[crlf-bug-check] First 100 bytes (hex): ${bytes.slice(0, 100).toString('hex')}`);
console.log(`[crlf-bug-check] First 5 lines:`);
console.log(content.split(/\r\n|\n/).slice(0, 5).map((l, i) => `  ${i}: "${l}"`).join('\n'));

const lineEnding = hasCRLF ? 'CRLF' : 'LF';
console.log(`\n✓ Detected line ending: ${lineEnding}`);
