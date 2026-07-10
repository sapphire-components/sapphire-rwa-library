###### Overview

A floating overlay (popover / tooltip / dropdown surface) built on top of Tippy. It anchors content to a trigger element and handles positioning, focus management, keyboard navigation, RTL flipping, and optional iframe content.

The `Overlay` attaches to a trigger element and shows a floating box containing either inline content, an external element, or an iframe. It supports click and hover triggers, persistent (manually dismissed) overlays, and full keyboard accessibility (Tab trapping, `Enter`/`Space` to toggle, `Escape` to close).

<a target="_blank" href="https://atomiks.github.io/tippyjs/v6/all-props/#placement">Tippy.js placement options</a>

<hr>

###### Input parameters

| Name                | Type           | Description                                                                                                                                                            |
| ------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExternalContentId` | `string`       | Overrides the `Content` placeholder with an element defined elsewhere on the page.                                                                                     |
| `ExternalTriggerId` | `string`       | Overrides the `Trigger` placeholder with an element defined elsewhere on the page.                                                                                     |
| `FocusOnClose`      | `boolean`      | Returns focus to the trigger when the overlay closes.                                                                                                                  |
| `FocusOnOpen`       | `boolean`      | Focuses the first focusable element when the overlay opens.                                                                                                            |
| `Height`            | `number`       | Fixed height in pixels.                                                                                                                                                |
| `IframeURL`         | `string`       | Renders the overlay content inside an iframe pointing at this URL.                                                                                                     |
| `MaxHeight`         | `number`       | Maximum height in pixels.                                                                                                                                              |
| `Options`           | `Structure`    | Tippy options controlling placement and behaviour. See the `Options` structure below.                                                                                 |
| `Padding`           | `SapphireSize` | Padding preset applied to the overlay box.                                                                                                                             |
| `Persistent`        | `boolean`      | Keeps the overlay open until explicitly closed and adds a close button.                                                                                                |
| `Theme`             | `string`       | Optional theme: `light`, `success`, `info`, `warning`, `error`. Include `disable-init` to skip auto-initialization, or `iframe-auto-size` to auto-size iframe content. |
| `Width`             | `number`       | Fixed width in pixels (also raises `maxWidth` when larger).                                                                                                            |

<hr>

###### `Options` structure

Tippy configuration passed through to the underlying instance.

| Property      | Type        | Description                                                                                                        |
| ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `placement`   | `string`    | Position of the overlay relative to the trigger (flipped automatically in RTL). See the Tippy placement link above. |
| `trigger`     | `string`    | Event(s) that open the overlay, e.g. `click` or `mouseenter focus`. Using `click` enables keyboard toggle.        |
| `arrow`       | `boolean`   | Renders a pointer arrow on the overlay.                                                                            |
| `delay`       | `Structure` | Show/hide delays in milliseconds: `{ Show, Hide }`.                                                                |
| `interactive` | `boolean`   | Keeps the overlay open while the pointer is over its content.                                                     |
| `hideOnClick` | `boolean`   | Hides the overlay when clicking outside it.                                                                        |
| `flip`        | `boolean`   | Allows flipping to the opposite placement when there is no room. When `false`, flipping is disabled.              |
| `maxWidth`    | `number`    | Maximum width in pixels. Non-numeric values resolve to `none`; overridden by `Width` when `Width` is larger.      |
| `appendTo`    | `string`    | Where the overlay is mounted. `body` appends to `<body>`; any other value mounts it next to the trigger.          |

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
