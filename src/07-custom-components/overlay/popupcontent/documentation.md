###### Overview

Structured content layout for the **Popup** widget from Service Studio. Use it when you need a dialog with a header, a scrollable body, an optional three-column footer, and an optional close button — without the built-in title, message, and action buttons of `ActionPopup`. It can also show another page in an iframe instead of placeholder content.

- The component renders a vertical flex layout: **Header** (fixed), **Body** (scrollable), and **Footer** (fixed, three columns).
- On initialization, focus moves into the popup content so keyboard users can interact immediately.
- The dialog is capped at `calc(100vh - 48px)`; when content exceeds that height, only the **Body** scrolls.
- Empty **Header** and **Body** placeholders are hidden. The **Footer** is hidden when all three footer placeholders are empty.
- When `HasClose` is `True`, a close button is shown in the top-right corner and the **Header** keeps a minimum height even when empty, so the close button does not overlap the body.
- When `HasSeparators` is `True`, horizontal separators are drawn between the header and body and between the body and footer.
- `Height` takes precedence over `MinHeight`. When both are `0`, the height follows the content.
- When `URL` is set, the component shows that page in an iframe that fills the popup, and the content of all placeholders is hidden. The close button stays. Without a fixed `Height`, the popup uses the full available height (`calc(100vh - 48px)`). Clearing `URL` removes the iframe and shows the placeholders again.
- `CloseOnEsc`, `Height`, `MinHeight`, and `URL` are applied again whenever they change at runtime.
- Only one popup is expected to be open at a time: the `Escape` key is listened for on the whole page.
- While focus is inside the iframe, `Escape` is handled by the loaded page and does not close the popup.
- `Theme` is written to `data-theme` on the root. The `printdocument` theme is used by the `PrintDocument` pattern for its print preview.

<hr>

###### Input parameters

| Name            | Type           | Description                                                                                                                                        |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CloseOnEsc`    | `Boolean`      | When `True` (default), pressing `Escape` fires the `Close` event.                                                                                  |
| `ExtendedClass` | `Text`         | Extra CSS classes added to the component root, separated by spaces.                                                                                |
| `HasClose`      | `Boolean`      | When `True` (default), shows the top-right close button and reserves header space for it. When `False`, the close button is hidden.               |
| `HasSeparators` | `Boolean`      | When `True`, draws separators between the header/body and body/footer sections. Default `False`.                                                   |
| `Height`        | `Integer`      | Fixed height of the popup content in pixels. When `0` (default), height grows with content (still limited by the viewport max-height).            |
| `MinHeight`     | `Integer`      | Minimum height of the popup content in pixels. Ignored when `Height` is set. When `0` (default), no minimum is applied.                           |
| `Padding`       | `SapphireSize` | Spacing preset for the dialog padding and section gaps. Supported values: `none`, `s`, `base` (default), `m`, `l`, `xl`.                          |
| `Theme`         | `Text`         | Space-separated theme tokens, reflected as `data-theme` on the root. `printdocument` is used by the `PrintDocument` pattern.                       |
| `URL`           | `Text`         | When set, loads this URL in an iframe inside the popup and hides the content of all placeholders. When empty (default), the placeholders show.     |
| `Width`         | `SapphireSize` | Width preset for the dialog. Supported values: `s` (400px), `m` (600px), `l` (960px, default), `xl` (1200px), `full` (viewport minus 48px).       |

<hr>

###### Placeholders

All placeholders are hidden while `URL` is set.

| Name           | Description                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `Header`       | Top section for a title or custom content. Rendered with heading-4 typography. Hidden when empty. |
| `Body`         | Main scrollable content area. Hidden when empty.                                                  |
| `FooterLeft`   | Left-aligned content in the footer grid (e.g. secondary actions).                                 |
| `FooterCenter` | Center-aligned content in the footer grid.                                                        |
| `FooterRight`  | Right-aligned content in the footer grid (e.g. primary actions).                                  |

<hr>

###### Events

| Name    | Description                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------ |
| `Close` | Fired when the close button is clicked or when `Escape` is pressed while `CloseOnEsc` is `True`. |
