---
name: update-docs
description: UPDATE-DOCS phase. Refresh README.md, AGENTS.md, and docs/index.html to reflect changes made this session. Commits and pushes doc updates. Terminal phase — declares COMPLETE.
---

# GM UPDATE-DOCS

Entry: feature verified, committed, pushed. Exit: docs match disk, committed, pushed → COMPLETE. Unknown architecture change → `planning`.

Every claim in docs is verifiable against disk. Phase names match frontmatter, platform names match `platforms/`, file paths exist, constraint counts are accurate. An unverifiable section is removed, not speculated.

## Sequence

What changed — run directly via Bash:

```
git log -5 --oneline
git diff HEAD~1 --stat
```

Read current docs via Read tool, or via a nodejs spool file (`in/nodejs/<N>.js`):

```
const fs = require('fs');
['README.md', 'AGENTS.md', 'docs/index.html', 'gm-starter/agents/gm.md'].forEach(f => {
  try { console.log(`=== ${f} ===\n` + fs.readFileSync(f, 'utf8')); }
  catch(e) { console.log(`MISSING: ${f}`); }
});
```

Write changed sections only:

- **README.md** — platform count, skill tree diagram, quick-start commands
- **AGENTS.md** — via `Agent(subagent_type='gm:memorize', model='haiku', run_in_background=true, prompt='## CONTEXT TO MEMORIZE\n<learnings>')`. Never inline-edit.
- **docs/index.html** — `PHASES` array, platform lists, state machine diagram
- **gm-starter/agents/gm.md** — skill chain line if new skills added

Verify from disk (Read tool, or a nodejs spool file):

```
const content = require('fs').readFileSync('/abs/path/file.md', 'utf8');
console.log(content.includes('expectedString'), content.length);
```

Commit and push directly via Bash:

```
git add README.md docs/index.html gm-starter/agents/gm.md
git commit -m "docs: update documentation to reflect session changes"
git push -u origin HEAD
```
