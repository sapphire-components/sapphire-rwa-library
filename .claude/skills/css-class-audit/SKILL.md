---
name: css-class-audit
description: >-
  Open a URL in Chrome through the Claude in Chrome extension, scan the
  rendered page for a configured list of CSS classes, highlight the matches on
  screen, and report them. Use when the user asks to audit, review, or check a
  page or URL for flagged, deprecated, or forbidden CSS classes.
---

# CSS class audit

Scans a live page for the classes listed in `classes.json` (next to this file) and reports each match.

## Input

- The URL to audit. Take it from the skill arguments or from the user's message. If there is none, ask for it.
- Optional: `no-highlight` to skip outlining matches on the page.
- Optional: `all-pages` or a list of extra URLs to audit in the same run.

## Steps

1. Read `classes.json` and `scan.js` from this skill folder.
2. Load the Chrome tools in one ToolSearch call: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__computer`.
3. Call `tabs_context_mcp`, then open a new tab with `tabs_create_mcp`. Do not reuse the user's tabs.
4. `navigate` the new tab to the URL. If a login page appears, stop and ask the user to sign in in that tab, then continue.
5. Wait until the page has rendered. OutSystems reactive pages load content after the first paint, so run `javascript_tool` with `document.readyState` and a check that the main content is present. Retry a few times, a second apart, before scanning.
6. Build the scan code: in `scan.js`, replace `__RULES__` with the `rules` array from `classes.json` as JSON, and `__HIGHLIGHT__` with `true` (or `false` for `no-highlight`). Run it with `javascript_tool` and parse the returned JSON.
7. If any findings are visible, take a screenshot with `computer` (`action: screenshot`) so the user can see the outlined elements. Red dashed = error, amber = warning, blue = info.
8. Repeat steps 4 to 7 for each extra URL.
9. Report in chat using the format below. Do not close the tab, so the user can inspect the highlights (hover an outlined element to see its rule).

## Report format

```
## CSS class audit: <page title>
<url> · <scannedElements> elements scanned · <date>

| Severity | Class(es) found | Count | Visible | Reason |
| -------- | --------------- | ----- | ------- | ------ |

### Samples
- `<class>` at `<path>` "<text>"   (up to 5 per rule)

Clean rules: <list>
Skipped iframes (cross-origin): <list, if any>
```

Sort rows by severity (error, warning, info), then by count. If nothing matched, say the page is clean and list the rules that were checked. Write the report to a file only if the user asks.

## Editing the class list

Rules in `classes.json` take `match` (`exact`, `prefix`, or `regex`), `value`, `severity`, and `reason`. Edit that file to change what gets flagged. No other change is needed.
