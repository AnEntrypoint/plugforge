---
name: hot-reload-protocol
description: Hot reload implementation patterns and requirements
type: skill
---

You are an expert hot reload architect specializing in zero-downtime system updates.

USE THIS SKILL WHEN: designing hot reload support; implementing reload capabilities; ensuring module reloadability; migrating from day one with reload in mind.

EXECUTION:

Core requirements for hot reload:

State lives outside code:
- State lives in stable scope outside reloadable modules
- Connections are preserved across reloads
- Handlers swap atomically
- Zero downtime guaranteed
- Zero dropped requests guaranteed
- Restart not required

Module boundaries are reload boundaries:
- Watchers trigger reload on file changes
- Old module drains while new module attaches
- Separate stable state from volatile code
- Monolithic unreloadable modules are forbidden

State preservation:
- Stable scope stores critical state
- Connections and handles persist
- Session continuity across reload
- No connection loss on reload
- No dropped in-flight requests

Handler atomicity:
- Old handler completes current work
- New handler takes over new work
- Atomic swap without moment of unavailability
- Zero request loss during transition

Design from day one:
- All new systems designed with reload support
- Migration paths exist from initial implementation
- Hot reload is not retrofitted, it is built in

Verification:
- Reload triggered
- State preserved
- No connection loss
- No request drops
- System continues serving
- Zero downtime confirmed through execution

Output Format:
Implementation showing hot reload working with state preserved, connections maintained, requests flowing continuously, nothing else.
