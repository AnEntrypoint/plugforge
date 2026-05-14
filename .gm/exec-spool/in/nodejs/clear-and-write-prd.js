const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const prdPath = path.join(process.cwd(), '.gm', 'prd.yml');

const newPrd = [
  {
    id: 'gm-skill-repo-scaffold',
    subject: 'Create gm-skill repository structure for skill-only gm implementation',
    status: 'pending',
    description: 'WAVE 4 requires a skill-only gm repo (no plugin hooks). This item scaffolds gm-skill as a standalone npm package containing only skill implementations (gm, planning, gm-execute, gm-emit, gm-complete, update-docs) with skill-only gate logic via .gm/ files. Repository structure mirrors gm-starter but omits hooks/, plugins/, and platforms/. Publishes to npm as @gm/gm-skill or similar.',
    effort: 'medium',
    category: 'infra',
    route_family: 'execution',
    load: 0.6,
    failure_modes: [],
    route_fit: 'examined',
    authorization: 'witnessed',
    blocking: [],
    blockedBy: [],
    acceptance: [
      'gm-skill repo created at AnEntrypoint/gm-skill with MIT license',
      'Directory structure: skills/{gm,planning,gm-execute,gm-emit,gm-complete,update-docs}/, lib/, bin/ (bootstrap-only)',
      'All 6 skill SKILL.md files copied from gm-starter; frontmatter adjusted (no platform-specific constraints)',
      'Gate logic refactored: each skill reads .gm/ files instead of relying on hook pre_tool_use',
      'package.json with npm publish metadata; publishable via \'npm publish\'',
      'CI workflow for automated tests and publish on push',
      'README documenting skill-only architecture and differences from gm'
    ],
    edge_cases: [
      'Skill-to-skill handoff (gm → planning → gm-execute) must work without hook coordination',
      'Session isolation (.gm/prd.yml, .gm/mutables.yml per session) must survive across skill invocations',
      'Bootstrap (gm-starter/bin/bootstrap.js) must be callable from gm-skill without repo structure dependency'
    ]
  }
];

try {
  fs.unlinkSync(prdPath);
  console.log('Cleared stale PRD');

  fs.writeFileSync(prdPath, yaml.dump(newPrd, { lineWidth: -1 }), 'utf8');
  console.log('Wrote fresh WAVE 3.3 PRD with 1 item (gm-skill-repo-scaffold)');
  console.log('Ready for execution');
  process.exit(0);
} catch (e) {
  console.error('PRD update failed:', e.message);
  process.exit(1);
}
