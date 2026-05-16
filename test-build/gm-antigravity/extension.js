const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const RULE_GM_STATE_MACHINE = `---
description: gm state machine — every task runs PLAN → EXECUTE → EMIT → VERIFY → COMPLETE. Each unknown is named and resolved by witnessed execution before any code is written.
trigger: always_on
---

# gm — state machine for coding sessions

Every task moves through five phases in order: PLAN, EXECUTE, EMIT, VERIFY, COMPLETE. Any new unknown surfaced during EXECUTE, EMIT, or VERIFY drops back to PLAN — never patched in place.

## Mutables

Every assumption that the agent has not yet seen evidence for is a *mutable*. Mutables are written down as UNKNOWN before code is written, and resolved only by running real code against real services. \`apiShape=UNKNOWN\` becomes \`apiShape=KNOWN(<witnessed value>)\` only after the agent saw the value in real output.

## Witnessed execution

A claim is closed only when real input has produced real output through the new code. Stubs, mocks, fixture-only branches, and "TODO: implement" do not count as resolution — they are mutables wearing closed-status disguise.

## Maximal cover

When the request exceeds reach, the agent enumerates every witnessable subset and executes each. Shipping one slice and naming the rest "follow-up" is distributed refusal — the same failure dressed as triage.

## Fix on sight

Every known-bad signal surfaced during work is fixed in-band, at root cause, the same session. Defer-markers, swallowed errors, and "address it next time" are forced closure.
`;

const WORKFLOW_PLAN_EXECUTE_EMIT_VERIFY = `---
description: Step-by-step lifecycle for any non-trivial task. Drives the gm five-phase machine to a clean tree and a green test.
---

# plan → execute → emit → verify → complete

1. **Orient.** Recall prior decisions and search the codebase for existing implementations of every noun in the request. Write findings as weak priors; misses confirm fresh unknowns.

2. **Plan.** Enumerate every UNKNOWN. For each, name the failure mode, the dependency, and the acceptance criterion (real input → real output). Write the list to \`.agent/plan.md\` if the task spans more than one file.

3. **Execute.** Resolve every UNKNOWN with witnessed code execution before any file is written. Run the call, capture the output, paste the witnessed value next to the assumption it closes.

4. **Emit.** Once every mutable is closed, write the files. Re-witness post-write — file-on-disk plus working call, not just file-on-disk.

5. **Verify.** End-to-end against real data. No mocks. If a behavior is observable in the browser, the verification includes a live page assertion against the specific invariant the change establishes.

6. **Complete.** Tree clean, tests green, plan file deleted, commit pushed.

If a new unknown surfaces in steps 3–5, return to step 2 and expand the plan. Never patch a mutable mid-flight.
`;

function scaffoldAgentDir() {
  const folders = vscode.workspace && vscode.workspace.workspaceFolders;
  if (!folders || !folders.length) return;
  const root = folders[0].uri.fsPath;
  const writeIfMissing = (relPath, body) => {
    const full = path.join(root, relPath);
    if (fs.existsSync(full)) return false;
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
    return true;
  };
  try {
    const wroteRule = writeIfMissing(path.join('.agent', 'rules', 'gm-state-machine.md'), RULE_GM_STATE_MACHINE);
    const wroteFlow = writeIfMissing(path.join('.agent', 'workflows', 'plan-execute-emit-verify.md'), WORKFLOW_PLAN_EXECUTE_EMIT_VERIFY);
    if (wroteRule || wroteFlow) {
      vscode.window.showInformationMessage('GM scaffolded .agent/ rules and workflows for this workspace.');
    }
  } catch (e) {
    console.error('GM .agent scaffold failed:', e && e.message);
  }
}

class GmExtension {
  constructor(context) {
    this.context = context;
    this.isActive = false;
  }

  async activate() {
    this.isActive = true;
    console.log('GM extension activated (Antigravity)');
    scaffoldAgentDir();
    this.registerCommands();
    this.setupConfiguration();
    this.showCodeSearchInfo();
  }

  registerCommands() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand('gm.activate', () => {
        vscode.window.showInformationMessage('GM activated');
      }),
      vscode.commands.registerCommand('gm.deactivate', () => {
        vscode.window.showInformationMessage('GM deactivated');
      }),
      vscode.commands.registerCommand('gm.showState', () => {
        vscode.window.showInformationMessage('GM state machine');
      })
    );
  }

  setupConfiguration() {
    const config = vscode.workspace.getConfiguration('gm');
    this.isActive = config.get('autoActivate', true);
  }

  showCodeSearchInfo() {
    const message = 'GM uses semantic code search - describe intent ("find auth logic") not regex. Use code-search to explore your codebase across files. Open README.md for details.';
    vscode.window.showInformationMessage(message);
  }

  deactivate() {
    this.isActive = false;
    console.log('GM extension deactivated');
  }
}

let gm;

function activate(context) {
  gm = new GmExtension(context);
  gm.activate();
}

function deactivate() {
  if (gm) {
    gm.deactivate();
  }
}

module.exports = { activate, deactivate };
