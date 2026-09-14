###### Overview

A floating overlay (popover / tooltip / dropdown surface) built on top of Tippy. It anchors content to a trigger element and handles positioning, focus management, keyboard navigation, RTL flipping, and optional iframe content.

The `Overlay` attaches to a trigger element and shows a floating box containing either inline content, an external element, or an iframe. It supports click and hover triggers, persistent (manually dismissed) overlays, and full keyboard accessibility (Tab trapping, `Enter`/`Space` to toggle, `Escape` to close).

<a target="_blank" href="https://atomiks.github.io/tippyjs/v6/all-props/#placement">Tippy.js placement options</a>

<hr>

###### Input parameters

| Name                | Type                  | Description                                                                                                                                                            |
| ------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExternalContentId` | `Text`                | Overrides the `Content` placeholder with an element defined elsewhere on the page.                                                                                     |
| `ExternalTriggerId` | `Text`                | Overrides the `Trigger` placeholder with an element defined elsewhere on the page.                                                                                     |
| `FocusOnClose`      | `Boolean`             | Returns focus to the trigger when the overlay closes.                                                                                                                  |
| `FocusOnOpen`       | `Boolean`             | Focuses the first focusable element when the overlay opens.                                                                                                            |
| `Height`            | `Integer`             | Fixed height in pixels.                                                                                                                                                |
| `IframeURL`         | `Text`                | Renders the overlay content inside an iframe pointing at this URL.                                                                                                     |
| `MaxHeight`         | `Integer`             | Maximum height in pixels.                                                                                                                                              |
| `Options`           | `TippyTooltipOptions` | Tippy options controlling placement and behaviour. See the `Options` structure below.                                                                                  |
| `Padding`           | `SapphireSize`        | Padding preset applied to the overlay box.                                                                                                                             |
| `Persistent`        | `Boolean`             | Keeps the overlay open until explicitly closed and adds a close button.                                                                                                |
| `Theme`             | `Text`                | Optional theme: `light`, `success`, `info`, `warning`, `error`. Include `disable-init` to skip auto-initialization, or `iframe-auto-size` to auto-size iframe content. |
| `Width`             | `Integer`             | Fixed width in pixels (also raises `maxWidth` when larger).                                                                                                            |

<hr>

###### `TippyTooltipOptions` structure

Tippy configuration passed through to the underlying instance.

| Property      | Type        | Description                                                                                                         |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `placement`   | `Text`      | Position of the overlay relative to the trigger (flipped automatically in RTL). See the Tippy placement link above. |
| `trigger`     | `Text`      | Event(s) that open the overlay, e.g. `click` or `mouseenter focus`. Using `click` enables keyboard toggle.          |
| `arrow`       | `Boolean`   | Renders a pointer arrow on the overlay.                                                                             |
| `delay`       | `Structure` | Show/hide delays in milliseconds: `{ Show, Hide }`.                                                                 |
| `interactive` | `Boolean`   | Keeps the overlay open while the pointer is over its content.                                                       |
| `hideOnClick` | `Boolean`   | Hides the overlay when clicking outside it.                                                                         |
| `flip`        | `Boolean`   | Allows flipping to the opposite placement when there is no room. When `false`, flipping is disabled.                |
| `maxWidth`    | `Integer`   | Maximum width in pixels. Non-numeric values resolve to `none`; overridden by `Width` when `Width` is larger.        |
| `appendTo`    | `Text`      | Where the overlay is mounted. `body` appends to `<body>`; any other value mounts it next to the trigger.            |

<hr>

###### Placeholders

| Name      | Description                         |
| --------- | ----------------------------------- |
| `Content` | Element to be displayed as content. |
| `Trigger` | Element to be used as the trigger.  |

<hr>

###### Events

| Name   | Description                             |
| ------ | --------------------------------------- |
| `Hide` | Fired when the overlay is hidden.       |
| `Show` | Fired when the overlay becomes visible. |
