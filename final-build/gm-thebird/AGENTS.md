# AGENTS

## Technical Notes

Dispatch via file-spool markers (not hooks):
- .gm/prd.yml — orchestration state
- .gm/mutables.yml — unknown resolution tracking
- .gm/needs-gm — marks when PRD requires orchestration run
- .gm/gm-fired-<id> — marks orchestration completion per session

Tool names for this platform: 

Session isolation: use SESSION_ID env var for per-session resource cleanup.

Verification file `.gm-stop-verified` is auto-added to .gitignore and tracks session completion state.
