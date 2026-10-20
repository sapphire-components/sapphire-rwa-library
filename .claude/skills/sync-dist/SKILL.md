---
name: sync-dist
description: >-
  Copy built dist CSS and JavaScript into the open OutSystems Service Studio
  modules through the sapphire-dev MCP. Use only when the user explicitly asks
  to sync, push, update, or replace dist files in OutSystems or Service Studio.
---

# Sync dist to OutSystems

Manual only. Run this when the user asks. Do not rebuild `dist/` unless they ask.

The element map is in `AGENTS.md`. The script applies and checks the files. Merge each saved module with the sapphire-dev `omlMerge` tool. A direct HTTP merge is rejected.

## Steps

1. On the first write in the conversation, tell the user this is a beta feature and link https://www.outsystems.com/legal/beta-features-agreement.
2. Service Studio must already have `RW_Core_Th`, `RW_Core_Lib`, and `RW_DesignSystem` open. If the sapphire-dev MCP is not connected, authenticate it.
3. Call `createSessionToken` once with `clientName` set to the tool you are running in (`Claude Code` or `Cursor`). Reuse that token, including one this session already holds. Never print it.
4. Call `startOmlEditSession` on `RW_Core_Th`, `RW_Core_Lib`, and `RW_DesignSystem`. The script fails with "No OML edit session is started" without them. If a session is already open on a module, call `endOmlEditSession` first.
5. Run from the repo root:

```bash
SAPPHIRE_MCP_TOKEN="<token>" node scripts/sync-dist-to-outsystems.mjs
```

6. Stop when the script exits non-zero. Report `SYNC_FAIL` and do not merge.
7. On `SYNC_RESULT`, call `omlMerge` once per `merges` entry through the sapphire-dev MCP tool. Pass `eSpaceName`, `mutatedOmlPath`, and `sessionToken`.
8. `merged: true` means that module is done. Do not call `omlMerge` again with the same path.
9. `InvalidIconLibrary` on `RW_Core_Theme` is expected. Any other validation error blocks that module.
10. Call `endOmlEditSession` on each module once its merge is done, or after a failure. Merged changes stay in the module.
11. Do not publish unless the user asks. When they do, publish `RW_Core_Th`, then `RW_Core_Lib`, then refresh references on `RW_DesignSystem` and publish it.
12. Reply with the module, element, dist file, and character count from `applied`. Unless you published, say the modules are updated and still need a publish from Service Studio.
