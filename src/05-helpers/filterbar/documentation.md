###### Overview

A layout helper that wraps filter UI content into a horizontal bar. When `IsSticky` is enabled, the bar pins to the top of the scrolling page and holds its place with a placeholder so the content underneath does not jump.

- Places the provided `Content` and `Actions` inside the bar wrapper.
- When `IsSticky` is `True`, the bar stays pinned for the page. A sticky table header on the same screen sits directly below it.

<hr>

###### Input parameters

| Name       | Type      | Description |
| ---------- | --------- | ----------- |
| `IsSticky` | `Boolean` | When `True`, pins the bar to the top of the page while content scrolls. |

<hr>

###### Placeholders

| Name      | Description |
| --------- | ----------- |
| `Actions` | Optional area for filter actions (buttons, menus, etc.) displayed in the bar header. |
| `Content` | The main filter UI/content rendered inside the bar. |
