# Agent context

## CSS

The CSS is the stylesheet of theme `RW_Core_Theme` in Service Studio module `RW_Core_Th`.

When reading or changing CSS through the sapphire-dev Service Studio MCP, open module `RW_Core_Th` and use the theme named `RW_Core_Theme`.

## Scripts

Each built JavaScript file in `dist/` has a Script element in Service Studio. When reading or changing one of these scripts through the sapphire-dev MCP, open the module below and use the Script with that name.

Module `RW_Core_Lib`:

| `dist/` file                 | Script                  |
| ---------------------------- | ----------------------- |
| `sapphire-rwa-ckeditor.js`   | `SapphireRWACKEditor`   |
| `sapphire-rwa-flags.js`      | `SapphireRWAFlags`      |
| `sapphire-rwa-icons.js`      | `SapphireRWAIcons`      |
| `sapphire-rwa-library.js`    | `SapphireRWALibrary`    |
| `sapphire-rwa-texteditor.js` | `SapphireRWATextEditor` |

Module `RW_DesignSystem`:

| `dist/` file                      | Script                      |
| --------------------------------- | --------------------------- |
| `sapphire-rwa-documentation.js`   | `SapphireRWADocumentation`  |
| `sapphire-rwa-static-entities.js` | `SapphireRWAStaticEntities` |

## Sync dist

Ask to sync dist into OutSystems. The agent follows `.claude/skills/sync-dist/SKILL.md` and runs `npm run sync:outsystems` with a Service Studio session token. Service Studio must already have `RW_Core_Th`, `RW_Core_Lib`, and `RW_DesignSystem` open. The command does not publish.

## Skills

Project skills live in `.claude/skills/`, one folder per skill with a `SKILL.md`. Claude Code and Cursor both load skills from that folder, so keep a single copy there and do not duplicate it under `.cursor/skills/`. Write skill steps so they work in either tool: name the client in `createSessionToken` after the tool that is running, and do not rely on `$ARGUMENTS` alone.
