###### Overview

A rich-text editor built on CKEditor 5 Classic (open-source / vanilla JS). The widget root (`.ckeditor`) hosts a `.ckeditor-host` node that CKEditor replaces at init. Vendor CSS and Sapphire token overrides are injected into the document once from this script.

- CKEditor lives in a **separate script**, `sapphire-rwa-ckeditor.js`. Include it on the block or screen that uses this widget, **after** `sapphire-rwa-library.js` and **before** the `OnReady` that constructs `SapphireRWALibrary.CKEditor`. The main library does not embed CKEditor.
- If the script is missing, `SapphireRWALibrary.CKEditor` is undefined — the `OnReady` construct will fail. There is no runtime fetch.
- `Content` is HTML. On init it is passed to the editor. Changing the `Content` input afterwards (`parametersChanged`) does **not** update the editor; use the `SetCKEditorContent` client action instead.
- `Change` fires on every user edit with both plain text and HTML. An empty editor emits empty strings. Non-breaking spaces in the HTML are normalized to regular spaces. Applying content via `SetCKEditorContent` is silent and does not fire `Change`. While **Source** is on, edits are not in the model, so `Change` does not fire until Source is turned off.
- `Focus` / `Blur` fire when the editor gains or loses focus.
- When `HasToolbar` is `False`, the Classic toolbar is hidden (`data-hastoolbar='false'`). Plugins stay loaded so existing formatted HTML still renders.
- `Height` is applied in pixels to the editable area (skipped when `0`). It is reapplied when the widget is resized (debounced).
- Hovering the editor sets `data-ishovered` on the root (stronger border). When `Enabled` is `False`, the editor is read-only and the root uses disabled styling (`data-enabled='false'`).
- After init, only `Enabled` is observed; other inputs (including `Content`) are construction-time.

<hr>

###### Input parameters

| Name          | Type      | Description                                                                                                                              |
| ------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Content`     | `Text`    | HTML content of the editor. Applied on init only. To replace content after init, call `SetCKEditorContent`.                              |
| `Enabled`     | `Boolean` | Enables or disables editing. When `False`, the editor is read-only and uses disabled styling.                                            |
| `HasToolbar`  | `Boolean` | When `True`, shows the Classic toolbar. When `False`, the toolbar is hidden.                                                             |
| `Height`      | `Integer` | Editor height in pixels. `0` leaves height unset. Applied at init and reapplied on widget resize.                                        |
| `Placeholder` | `Text`    | Placeholder shown when the editor is empty.                                                                                              |

<hr>

###### Toolbar (v1)

Fixed Classic toolbar (token-string `ToolbarOptions` is not supported yet). Controls, in order: font size (Small / Regular / Large / Huge), bold, italic, underline, strikethrough, link, image, font colour, highlight, alignment, numbered list, bullet list, table, clear formatting, source, full screen.

- **Link** inserts or edits a hyperlink on the current selection. The balloon asks for a URL. `https://` is added when the protocol is omitted, and an email address becomes `mailto:`. External links (`http`, `https`, or `//`) are saved with `target="_blank"` and `rel="noopener noreferrer"`. Typing or pasting a URL also turns it into a link.
- **Image** inserts an image from a URL. The toolbar button asks for the image address (a full URL, for example `https://…`). There is no file upload. Click the image to open its toolbar: **Link** makes the image open an external URL, using the same link rules as text (`https://` when the protocol is omitted, `target="_blank"` and `rel="noopener noreferrer"` on external links). **Alt text** sets the image alternative. Select an existing image and use the image button again to replace its URL.

- **Source** toggles an HTML view of the document. Edits are applied when source mode is turned off, and markup outside the enabled features (bold, lists, tables, images, and so on) is dropped. Turning Source on fires `ChangeDetection` with `IsActive` `False` (live `Change` stops). Turning it off commits the HTML, fires `Change` when that HTML differs, then fires `ChangeDetection` with `IsActive` `True`.
- **Full screen** covers the viewport. There is no menu bar in that mode. The configured `Height` applies to the normal editor and to the source view; full screen uses CKEditor's own layout.

<hr>

###### Events

| Name               | Description                                                                                                                                                                                          | Arguments                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Blur`             | Fired when the editor loses focus.                                                                                                                                                                   | `Identifier` (`Text`)                                      |
| `Change`           | Fired on every user edit. Empty editor → `""`. Does not fire for `SetCKEditorContent`, and does not fire while Source is on.                                                                         | `Identifier` (`Text`), `Text` (`Text`), `Html` (`Text`)    |
| `ChangeDetection`  | Fired when live `Change` reporting starts or stops. `IsActive` is `False` while Source is on and `True` when Source is turned off. Starts active; not fired on init.                                | `Identifier` (`Text`), `IsActive` (`Boolean`)              |
| `Focus`            | Fired when the editor gains focus.                                                                                                                                                                   | `Identifier` (`Text`)                                      |

<hr>

###### Client Actions

| Name                 | Description                                                                                                                                                                                                                   | Arguments                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `SetCKEditorContent` | Global client action to replace the editor HTML from outside (instead of changing the `Content` input). Sanitized with DOMPurify and applied silently (does not fire `Change`). `Identifier` must match the widget instance. Call `SapphireRWALibrary.CKEditor.setContent(Identifier, Content)`. | `Identifier` (`Text`), `Content` (`Text`) |
