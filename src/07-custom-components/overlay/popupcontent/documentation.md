###### Overview

Structured content layout for the **Popup** widget from Service Studio. Use it when you need a dialog with a header, a scrollable body, an optional three-column footer, and an optional close button — without the built-in title, message, and action buttons of `ActionPopup`.

- The component renders a vertical flex layout: **Header** (fixed), **Body** (scrollable), and **Footer** (fixed, three columns).
- On initialization, focus moves into the popup content so keyboard users can interact immediately.
- The dialog is capped at `calc(100vh - 48px)`; when content exceeds that height, only the **Body** scrolls.
- Empty **Header** and **Body** placeholders are hidden. The **Footer** is hidden when all three footer placeholders are empty.
- When `HasClose` is `True`, a close button is shown in the top-right corner and the **Header** keeps a minimum height even when empty, so the close button does not overlap the body.
- When `HasSeparators` is `True`, horizontal separators are drawn between the header and body and between the body and footer.

<hr>

###### Input parameters

| Name            | Type            | Description                                                                                                                                 |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `CloseOnEsc`    | `Boolean`       | When `True`, pressing `Escape` fires the `Close` event.                                                                                     |
| `HasClose`      | `Boolean`       | When `True`, shows the top-right close button and reserves header space for it. When `False`, the close button is hidden.                   |
| `HasSeparators` | `Boolean`       | When `True`, draws separators between the header/body and body/footer sections.                                                             |
| `Height`        | `Integer`       | Fixed height of the popup content in pixels. When `0`, height grows with content (still limited by the viewport max-height).                |
| `MinHeight`     | `Integer`       | Minimum height of the popup content in pixels. When `0`, no minimum is applied.                                                             |
| `Padding`       | `SapphireSize`  | Spacing preset for the dialog padding and section gaps. Supported values: `none`, `s`, `base`, `m`, `l`, `xl`.                              |
| `Width`         | `SapphireScale` | Width preset for the dialog. Supported values: `s` (400px), `m` (600px), `l` (960px, default), `xl` (1200px), `full` (viewport minus 48px). |

<hr>

###### Placeholders

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
