---
name: sync-dist
description: >-
  Copy built dist CSS and JavaScript into the open OutSystems Service Studio
  modules through the sapphire-dev MCP, then publish them. Use only when the
  user explicitly asks to sync, push, update, or replace dist files in
  OutSystems or Service Studio.
---

# Sync dist to OutSystems

Manual only. Run this when the user asks. Do not rebuild `dist/` unless they ask.

The element map is in `AGENTS.md`; the `targets` list in `scripts/sync-dist-to-outsystems.mjs` must match it. The script applies and checks the files. Merge each saved module with the sapphire-dev `omlMerge` tool, then publish with `omlPublish`. A direct HTTP merge is rejected.

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
11. Publish only when every module merged with `merged: true`. If any merge failed, publish nothing and report it. Publish one module at a time, in this order, and wait for each result:
    1. `omlPublish` on `RW_Core_Th`.
    2. `omlPublish` on `RW_Core_Lib`.
    3. `omlRefreshReferences` on `RW_DesignSystem`, then `omlPublish` on it.

    Pass `sessionToken` on every call, even though these schemas do not declare it. A publish succeeded when it returns `published: true` and `status: "success"`. On any other result, stop the chain and report `status` and `reason`. On `status: "blocked"`, tell the user to allow automatic merge and publish in the Service Studio MCP Server dialog, or to publish from Service Studio. Do not retry. If `omlRefreshReferences` returns `hasErrors: true`, do not publish `RW_DesignSystem`; report it.
12. Reply with the module, element, dist file, and character count from `applied`, and the publish result for each module. If a module was not published, say which ones still need a publish from Service Studio.
