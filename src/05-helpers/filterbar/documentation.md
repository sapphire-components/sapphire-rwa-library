###### Overview

A layout helper that wraps filter UI content into a horizontal bar. When `IsSticky` is enabled, the helper measures its own dimensions and uses a placeholder to prevent layout jump while the bar is fixed.

- Places the provided `Content` and `Actions` inside the bar wrapper.
- When `IsSticky` is `True`, the bar becomes fixed (`position: fixed`) and keeps its original width while the page scrolls.
- The helper sets CSS variables (`--filterbar-top`, `--filterbar-width`, `--filterbar-height`) to support fixed positioning and the spacing placeholder.

<hr>

###### Input parameters

| Name       | Type      | Description |
| ---------- | --------- | ----------- |
| `IsSticky` | `Boolean` | When `True`, sets `data-isfixed="true"` so the bar is fixed and the layout placeholder reserves space during scroll. |

<hr>

###### Placeholders

| Name      | Description |
| --------- | ----------- |
| `Actions` | Optional area for filter actions (buttons, menus, etc.) displayed in the bar header. |
| `Content` | The main filter UI/content rendered inside the bar. |
