---
name: ssh
description: Run shell commands on remote SSH hosts via exec:ssh. Reads targets from ~/.claude/ssh-targets.json. Use for deploying, monitoring, or controlling remote machines.
---

# exec:ssh — Remote SSH execution

Runs shell commands on a remote host. No manual connection needed.

## Setup

`~/.claude/ssh-targets.json`:

```json
{
  "default": { "host": "192.168.1.10", "port": 22, "username": "pi", "password": "pass" },
  "prod": { "host": "10.0.0.1", "username": "ubuntu", "keyPath": "/home/user/.ssh/id_rsa" }
}
```

`host` and `username` required. `port` defaults to 22. Auth: `password` OR `keyPath` + optional `passphrase`.

## Usage

```
exec:ssh
<shell command>
```

Named host with `@name` on the first line:

```
exec:ssh
@prod
sudo systemctl restart myapp
```

## Process persistence

SSH kills child processes on close. To survive disconnect:

```
exec:ssh
sudo systemctl reset-failed myunit 2>/dev/null; systemd-run --unit=myunit bash -c 'your-command'
```

Unique unit name per launch:

```
exec:ssh
systemd-run --unit=job-$(date +%s) bash -c 'nohup myprogram &'
```

No-systemd fallback:

```
exec:ssh
setsid nohup bash -c 'myprogram > /tmp/out.log 2>&1' &
```

## Dependency

Requires `ssh2` in `~/.claude/gm-tools`. Write to `.gm/exec-spool/in/nodejs/<N>.js`:

```js
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const gmTools = path.join(os.homedir(), '.claude', 'gm-tools');
execSync('npm install ssh2', { cwd: gmTools, stdio: 'inherit' });
```
