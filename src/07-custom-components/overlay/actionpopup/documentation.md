###### Overview

A modal action popup with a backdrop that blocks interaction with the page. It renders a title, a message, optional custom content (via the `Content` placeholder), a close button in the top-right corner, and up to three action buttons: Cancel, Negative and Positive.

- When a button label is "", that button is not displayed.
- The Positive button always shows a `check-bold` icon before its label.
- Visibility is driven by the `IsOpen` input. On open, the dialog is teleported to `<body>`, page scroll is locked, focus moves into the dialog and Tab is trapped inside it.
- Inside an iframe, the popup opens in the top window so it covers the whole page (the iframe must be same-origin). The popup's styles, design tokens and icons are copied there, so the top window can be a Reactive or Traditional app without this library.
    - Whatever is in the `Content` placeholder moves to the top window with the popup and still displays and updates (text, expressions, images). Its Reactive interactions stop working there: `OnClick` and other events on buttons, links or inputs do not fire, and widgets such as date pickers or dropdowns do not open or position correctly. They also lose the iframe's OutSystems UI and theme styles.
    - If the popup needs interactive content, use it only at the top level, not inside an iframe.
- The close button (top-right) is only rendered when `HasClose` is `True`. The `Escape` key closes the popup only when `HasClose` AND `CloseOnEsc` are both `True`; when `HasClose` is `False` the popup can only be dismissed through the action buttons. Both the close button and `Escape` trigger the `Cancel` event. Clicking the backdrop never closes it.
- The Cancel / Negative / Positive buttons raise their respective events and then close the popup.
- The `Close` event fires whenever the popup closes, regardless of the trigger (any button, the close icon, `Escape`, or `IsOpen` being set to `False`). It is emitted after the specific button event.

<hr>

###### Input parameters

| Name          | Type            | Description                                                                                                                                                                |
| ------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CloseOnEsc`  | `Boolean`       | When `True` (and `HasClose` is `True`), pressing `Escape` closes the popup (fires `Cancel`).                                                                               |
| `Enabled`     | `Boolean`       | Enables or disables the Cancel / Negative / Positive action buttons. When `False`, those buttons are disabled and ignore clicks; the close button and `Escape` still work. |
| `HasClose`    | `Boolean`       | When `True`, shows the top-right close button. When `False`, hides it and disables the `Escape` shortcut, so the popup is only dismissible via the action buttons.         |
| `IsOpen`      | `Boolean`       | Controls visibility of the popup.                                                                                                                                          |
| `LabelCancel` | `Text`          | Label on the cancel button. Button hidden when "".                                                                                                                         |
| `LabelNo`     | `Text`          | Label on the negative button. Button hidden when "".                                                                                                                       |
| `LabelYes`    | `Text`          | Label on the affirmative button. Button hidden when "".                                                                                                                    |
| `Message`     | `Text`          | Message of the popup. Hidden when empty.                                                                                                                                   |
| `Padding`     | `SapphireSize`  | Spacing preset for the dialog sections. Defaults to `m`.                                                                                                                   |
| `Title`       | `Text`          | Title of the popup. Hidden when empty.                                                                                                                                     |
| `Width`       | `SapphireScale` | Spacing preset for the dialog width. Defaults to `m`.                                                                                                                      |

<hr>

###### Placeholders

| Name      | Description                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Content` | Placeholder for custom content. Inside an iframe the content is shown in the top window, but its Reactive interactions do not work there. |

<hr>

###### Events

| Name     | Description                                                                                                                           | Arguments             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `Cancel` | Fired when the Cancel button is clicked, or when the close button / `Escape` dismisses the popup. The popup then closes.              | `Identifier` (`Text`) |
| `Close`  | Fired whenever the popup closes, after any preceding button event (`Cancel` / `No` / `Yes`), including when `IsOpen` becomes `False`. | `Identifier` (`Text`) |
| `No`     | Fired when the Negative button is clicked. The popup then closes.                                                                     | `Identifier` (`Text`) |
| `Yes`    | Fired when the Positive button is clicked. The popup then closes.                                                                     | `Identifier` (`Text`) |
