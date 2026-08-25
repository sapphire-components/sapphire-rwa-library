###### Overview

A print-preview pattern: a trigger button that opens a modal popup containing the document at `DocumentURL` in an iframe. Use it when you need to preview (and optionally print) a generated document without leaving the current screen.

- The pattern renders as an inline print button labelled with `LabelPrint`. Clicking it opens a `SapphirePopupContent` popup themed `printdocument`.
- The popup body hosts an iframe (`printpreview`) that loads `DocumentURL` full-size, with no border. Body overflow is left to the iframe so the document scrolls inside the frame rather than the popup.
- A close button in the popup dismisses it and returns to the host screen. The button must have the `btn-close` CSS class.
- The popup footer is the same three-column grid as `SapphirePopupContent` (`FooterLeft` / `FooterCenter` / `FooterRight`). Put extra actions there (for example Download). The footer is hidden when all three placeholders are empty.
- When `Enabled` is `False`, the trigger button is disabled and the popup cannot be opened from it.

<hr>

###### Input parameters

| Name          | Type      | Description                                                                            |
| ------------- | --------- | -------------------------------------------------------------------------------------- |
| `CloseOnEsc`  | `Boolean` | When `True`, pressing `Escape` fires the `Close` event.                                |
| `DocumentURL` | `Text`    | URL of the document loaded in the print-preview iframe.                                |
| `Enabled`     | `Boolean` | Enables or disables the print trigger button. When `False`, the button ignores clicks. |
| `LabelPrint`  | `Text`    | Label for the button that triggers the Print Preview popup.                            |

<hr>

###### Placeholders

| Name           | Description                                               |
| -------------- | --------------------------------------------------------- |
| `FooterLeft`   | Left-aligned content in the print-preview popup footer.   |
| `FooterCenter` | Center-aligned content in the print-preview popup footer. |
| `FooterRight`  | Right-aligned content in the print-preview popup footer.  |
