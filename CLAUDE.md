# Technical Caveats & Gotchas

## Agent Naming Convention (Jan 28)

Agents in the `plugforge-starter/agents/` directory are registered by the **YAML frontmatter `name` field**, not the filename.

Critical: The codesearch.md agent must have `name: code-search` (with hyphen) in its frontmatter, not `name: web-search`. The pre-tool-use-hook blocks Glob/Grep/Search tools and redirects to use the agent named exactly "code-search".

Each agent file structure:
```markdown
---
name: agent-name  # This is what gets registered
description: "..."
model: haiku
color: blue
---

Agent instructions here...
```

The convention-loader discovers agents by reading all .md files in agents/ and extracting the frontmatter name field.

## Agent vs Skill vs MCP Server

In this codebase:
- **Agents**: .md files in agents/ with YAML frontmatter - autonomous entities with system prompts
- **Skills**: Do not exist in this system (not implemented)
- **MCP Servers**: Defined in glootie.json under "mcp" key - external tools/services

The hook blocks Glob/Grep/Search and says to use "code-search agent" - this refers to the agent with `name: code-search` in frontmatter, not a skill or MCP server.
