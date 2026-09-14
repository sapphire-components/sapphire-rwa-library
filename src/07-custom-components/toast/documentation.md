###### Overview

A global toast notification service (`SapphireRWALibrary.Toast`) that shows stacked messages at the top centre of the screen. It is not a screen widget: call it from client logic to create or clear notifications.

- Toasts are mounted into `#transitionContainer` inside a fixed `.toast` stack (centred, below the top of the viewport). Newer messages are prepended above older ones.
- Each toast shows a type icon, optional `Title`, `Body` (HTML), an optional close affordance, and a progress bar that tracks `TimeToLive`.
- Supported types come from `Alert`: `alert-info`, `alert-error`, `alert-success`, `alert-warning`. Unknown types fall back to `alert-info`. Icons and colours follow the shared `Alert` / `SapphireColor` list.
- When `TimeToLive` is greater than `0`, the progress bar runs for that many seconds and then dismisses the toast. When it is `0`, the toast stays until the user dismisses it.
- Clicking the toast (or its close control when `HasClose` is `True`) starts the removal animation. When the last toast is gone, the container is removed.
- When more than one toast is visible, a **Close all** button appears below the stack. Clicking it dismisses every remaining toast with the same removal animation. The button hides again as soon as fewer than two toasts are left.

<hr>

###### Actions

| Name                      | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `CreateToastNotification` | Creates and shows a toast from a message object `ToastMessage`.    |
| `ClearToastNotifications` | Removes all toasts and tears down the toast container immediately. |

<hr>

###### Message structure (`ToastMessage`)

Passed to `CreateToastNotification`.

| Property     | Type      | Description                                                                                                                  |
| ------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Body`       | `Text`    | Main content. Rendered as HTML (supports links and markup).                                                                  |
| `HasClose`   | `Boolean` | When `True`, shows a close (`x`) icon. The whole toast is still dismissible by click either way.                             |
| `TimeToLive` | `Integer` | Auto-dismiss duration in seconds. Drives the progress bar. `0` means no auto-dismiss (toast stays until clicked or cleared). |
| `Title`      | `Text`    | Bold title above the body. Empty string hides meaningful title text.                                                         |
| `Type`       | `Alert`   | Visual variant. Icons and colours follow the shared `Alert` / `SapphireColor` list.                                          |
