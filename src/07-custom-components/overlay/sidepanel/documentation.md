###### Overview

A full-height panel that slides in from the trailing edge of the viewport (the right in LTR, the left in RTL). The content is a fixed **Header**, a scrolling **Body**, and a three-column **Footer**.

- The block wrapper uses `display: contents`. On init the panel moves to `<body>`, so it covers the viewport, and it is marked as a dialog.
- `IsOpen` `False` (the default) hides the panel and marks it `inert`. `IsOpen` `True` shows it at full height, above the page.
- Opening plays a 200ms slide. `prefers-reduced-motion: reduce` skips the animation.
- `Width` is a `SapphireSize` preset written to `data-widthcomponent`. The panel is as wide as the viewport, up to that preset. The default is `xl2` (480px).
- `HasOverlay` `True` (the default) adds a backdrop, locks page scroll, sets `aria-modal="true"` while the panel is open, and traps Tab inside it.
- `HasClose` `True` (the default) shows a close button (`x`) in the top trailing corner. Clicking it closes the panel.
- `CloseOnEsc` `True` (the default) closes the panel on `Escape` and on a backdrop click. The backdrop uses a pointer cursor in that case. The close button still closes the panel when `CloseOnEsc` is `False`.
- The close button, `Escape`, a backdrop click, and `toggle()` fire `Toggle` with the new `IsOpen`. Setting `IsOpen` from the parent updates the panel without firing `Toggle`.
- On open, focus moves to the first focusable element in the **Body**, then the close button, then the panel. On close, focus returns to the element that had it before the panel opened.
- `Padding` `base` (the default, 16px) pads the **Header**, **Body**, and **Footer**. The **Body** end padding is 8px, so the content lines up beside the scrollbar gutter.
- An empty **Header** is hidden. The **Body** is the region that scrolls. **FooterLeft**, **FooterCenter**, and **FooterRight** stay in a three-column footer.

<hr>

###### Input parameters

| Name            | Type           | Description                                                                                                                                          |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CloseOnEsc`    | `Boolean`      | When `True` (the default), `Escape` and a backdrop click close the panel and fire `Toggle`.                                                         |
| `Enabled`       | `Boolean`      | Written to `data-enabled` on the root. Defaults to `True`.                                                                                          |
| `ExtendedClass` | `Text`         | Extra CSS classes added to the panel root, separated by spaces.                                                                                     |
| `HasClose`      | `Boolean`      | When `True` (the default), shows the close button in the top trailing corner.                                                                       |
| `HasOverlay`    | `Boolean`      | When `True` (the default), shows a backdrop, locks page scroll, and traps Tab inside the open panel.                                                |
| `Identifier`    | `Text`         | Optional identifier, written to `data-identifier` and passed back on `Toggle`.                                                                      |
| `IsOpen`        | `Boolean`      | Controls visibility. Defaults to `False`. A change from the parent updates the panel without firing `Toggle`.                                       |
| `Padding`       | `SapphireSize` | Padding of the header, body, and footer, written to `data-padding`. Defaults to `base` (16px). The body end padding is 8px.                         |
| `Theme`         | `Text`         | Optional space-separated theme tokens, written to `data-theme`.                                                                                     |
| `Width`         | `SapphireSize` | Width preset (`auto`, `xs`–`xl7`, `full`, and so on) written to `data-widthcomponent`. The panel grows up to that width. Defaults to `xl2` (480px). |

<hr>

###### Placeholders

| Name           | Description                                                                          |
| -------------- | ------------------------------------------------------------------------------------ |
| `Header`       | Top section for a title or custom content. Hidden when empty.                       |
| `Body`         | Main content. Grows to fill the space between the header and the footer, and scrolls. |
| `FooterLeft`   | Left-aligned content in the footer grid (for example a secondary action).           |
| `FooterCenter` | Center-aligned content in the footer grid.                                           |
| `FooterRight`  | Right-aligned content in the footer grid (for example a primary action).            |

<hr>

###### Events

| Name     | Description                                                                                                                    | Arguments                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `Toggle` | Fired when the panel opens or closes from the close button, `Escape`, a backdrop click, or `toggle()`.                        | `Identifier` (`Text`), `IsOpen` (`Boolean`) |

<hr>

###### Client methods

| Name       | Description                                                          |
| ---------- | -------------------------------------------------------------------- |
| `toggle()` | Flips `IsOpen`, shows or hides the panel, and fires `Toggle`.       |
