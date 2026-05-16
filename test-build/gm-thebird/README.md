# gm-thebird

Browser-native gm output. Loads rs-plugkit as a WebAssembly module
via plugsdk's wasm-kind dispatcher under [Freddie](https://github.com/AnEntrypoint/freddie)
inside [thebird](https://github.com/AnEntrypoint/thebird).

1:1 feature parity with gm-cc — same skills, same hooks, same state
machine — but the plugkit binary is plugkit.wasm instead of a native
process. plugkit.wasm is published to
https://github.com/AnEntrypoint/plugkit-bin/releases alongside the
native targets.

## Install

```bash
npm install -g gm-thebird
gm-thebird
```

The installer copies the plugin to `~/.freddie/plugins/gm-thebird`
and fetches the matching plugkit.wasm version from plugkit-bin.

Restart Freddie. The plugin loads via plugsdk; hooks fire as wasm
exports (hook_pre_tool_use, hook_post_tool_use, hook_session_start,
hook_user_prompt_submit, hook_pre_compact, hook_post_compact,
hook_stop, hook_stop_git).

## Browser

When Freddie runs inside thebird's docs/ shell, the same plugin
loads — thebird's POSIX-in-browser layer supplies the WASI preview1
imports plugkit.wasm needs.
