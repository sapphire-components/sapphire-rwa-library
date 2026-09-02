###### Overview

A rich-text editor built on Quill (`snow` theme), with an optional custom toolbar and table editing (`quill-table-better`). The widget root (`.texteditor`) hosts a `.quill-editor` node; Quill Snow and table-better styles are injected into the document once.

- The editor is created only when `Mode` is `html`. Other mode values leave the host empty.
- `Content` is HTML. On init it is pasted into the editor; later updates (via `parametersChanged`) are sanitized with DOMPurify before being applied.
- `Change` fires on every Quill `text-change` with both plain text and semantic HTML. An empty editor emits empty strings (not Quill's default `<p><br></p>`). Non-breaking spaces in the HTML are normalized to regular spaces.
- `Focus` / `Blur` fire when the editor root gains or loses focus.
- When `HasToolbar` is `True`, a custom toolbar is prepended. Visible controls come from space-separated tokens in `ToolbarOptions`. When `HasToolbar` is `False`, the toolbar is omitted / hidden (`data-hastoolbar='false'`).
- `Height` is applied in pixels to `.quill-editor` (skipped when `0`). It is reapplied when the widget is resized (debounced).
- Hovering the editor sets `data-ishovered` on the root (stronger border). When `Enabled` is `False`, Quill is disabled and the root uses disabled styling (`data-enabled='false'`).
- After init, only `Enabled` and `Content` are observed; other inputs are construction-time.

<hr>

###### Input parameters

| Name              | Type      | Description                                                                                                                                                          |
| ----------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content`         | `Text`    | HTML content of the editor. Updates after init are sanitized (DOMPurify) and applied silently.                                                                       |
| `Enabled`         | `Boolean` | Enables or disables editing. When `False`, Quill is disabled and the editor uses disabled styling.                                                                   |
| `HasToolbar`      | `Boolean` | When `True`, renders the custom toolbar. When `False`, the toolbar is not created / is hidden.                                                                       |
| `Height`          | `Integer` | Editor height in pixels. `0` leaves height unset. Applied at init and reapplied on widget resize.                                                                    |
| `Mode`            | `Text`    | Editor mode. Only `html` initializes the Quill editor. Other values skip initialization.                                                                             |
| `Placeholder`     | `Text`    | Placeholder shown when the editor is empty.                                                                                                                          |
| `ToolbarOptions`  | `Text`    | Space-separated list of toolbar controls to show (only used when `HasToolbar` is `True`). See the tokens below. Unknown tokens are ignored.                          |

<hr>

###### Toolbar options (`ToolbarOptions`)

Space-separated tokens, for example `"bold italic underline size color"`. Order in the string does not change toolbar order; the toolbar always lays out controls in a fixed sequence.

| Token           | Description                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `size`          | Font size select: Huge, Large, Regular (default), Small.                                             |
| `bold`          | Bold.                                                                                                |
| `italic`        | Italic.                                                                                              |
| `underline`     | Underline.                                                                                           |
| `strike`        | Strikethrough.                                                                                       |
| `color`         | Text colour palette.                                                                                 |
| `background`    | Highlight / background colour palette.                                                               |
| `align`         | Paragraph alignment: start (default), center, right, justify.                                        |
| `list-ordered`  | Numbered list.                                                                                       |
| `list-bullet`   | Bullet list.                                                                                         |
| `table`         | Insert / edit table (`quill-table-better`).                                                          |
| `clean`         | Clear formatting.                                                                                    |

<hr>

###### Events

| Name     | Description                                                                                                          | Arguments                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `Blur`   | Fired when the editor loses focus.                                                                                   | `Identifier` (`Text`)                                  |
| `Change` | Fired on every edit (Quill `text-change`), including when `Content` is applied from outside. Empty editor → `""`.    | `Identifier` (`Text`), `Text` (`Text`), `Html` (`Text`) |
| `Focus`  | Fired when the editor gains focus.                                                                                   | `Identifier` (`Text`)                                  |
