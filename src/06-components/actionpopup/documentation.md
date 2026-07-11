###### Overview

A modal action popup with a backdrop that blocks interaction with the page. It renders a title, a message, optional custom content (via the `Content` placeholder), a close button in the top-right corner, and up to three action buttons: Cancel, Negative and Positive.

- When a button label is "", that button is not displayed.
- The Positive button always shows a `check-bold` icon before its label.
- Visibility is driven by the `IsOpen` input. On open, the dialog is teleported to `<body>`, page scroll is locked, focus moves into the dialog and Tab is trapped inside it.
- The close button (top-right) is only rendered when `HasClose` is `True`. The `Escape` key closes the popup only when `HasClose` AND `CloseOnEsc` are both `True`; when `HasClose` is `False` the popup can only be dismissed through the action buttons. Both the close button and `Escape` trigger the `Cancel` event. Clicking the backdrop never closes it.
- The Cancel / Negative / Positive buttons raise their respective events and then close the popup.
- The `Close` event fires whenever the popup closes, regardless of the trigger (any button, the close icon, `Escape`, or `IsOpen` being set to `False`). It is emitted after the specific button event.

<hr>

###### Input parameters

| Name          | Type            | Description                                                                                                                                                        |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CloseOnEsc`  | `boolean`       | When `True` (and `HasClose` is `True`), pressing `Escape` closes the popup (fires `Cancel`).                                                                       |
| `HasClose`    | `boolean`       | When `True`, shows the top-right close button. When `False`, hides it and disables the `Escape` shortcut, so the popup is only dismissible via the action buttons. |
| `IsOpen`      | `boolean`       | Controls visibility of the popup.                                                                                                                                  |
| `LabelCancel` | `string`        | Label on the cancel button. Button hidden when "".                                                                                                                 |
| `LabelNo`     | `string`        | Label on the negative button. Button hidden when "".                                                                                                               |
| `LabelYes`    | `string`        | Label on the affirmative button. Button hidden when "".                                                                                                            |
| `Message`     | `string`        | Message of the popup. Hidden when empty.                                                                                                                           |
| `Padding`     | `SapphireSize`  | Spacing preset for the dialog sections. Defaults to `m`.                                                                                                           |
| `Title`       | `string`        | Title of the popup. Hidden when empty.                                                                                                                             |
| `Width`       | `SapphireScale` | Spacing preset for the dialog width. Defaults to `m`.                                                                                                              |

<hr>

###### Placeholders

| Name      | Description                     |
| --------- | ------------------------------- |
| `Content` | Placeholder for custom content. |
| `Header`  | Placeholder for custom content. |

<hr>

###### Events

| Name     | Description                                 |
| -------- | ------------------------------------------- |
| `Toggle` | Fired when the component changes its state. |
