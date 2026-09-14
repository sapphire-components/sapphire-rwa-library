###### Overview

An inline alert banner that shows a semantic type icon, a free-form `Content` placeholder, and an optional `Actions` placeholder. `Type` is an `Alert` value; the matching icon and `SapphireColor` are shared with Status, Toast, and other feedback components. `Shape` is a `Shape` value that controls corner radius.

- The component inserts the type icon before the `Content` placeholder, then places the `Actions` placeholder immediately after it.
- `Content` grows to fill remaining width, which pushes `Actions` to the trailing end of the bar.
- When `HasClose` is `True`, an `x` button is rendered in the top-right corner. Clicking it fires `Close`.
- `Type` accepts `alert-info`, `alert-warning`, `alert-success`, or `alert-error`. Unknown values fall back to `alert-info`.
- `Shape` accepts `rounded` (pill, default), `soft` (8px radius), or `none` (sharp corners). Unknown values fall back to `rounded`.
- Default colouring uses the solid `SapphireColor` tokens (`info`, `warning`, `success`, `error`). Text, links, buttons, and icons are white (`neutral-0`), except `alert-warning`, which uses `neutral-10`. Pass `Theme` containing `light` for the tinted background / dark text treatment.
- `parametersChanged` re-reads the live host and placeholders, then updates type, shape, size, theme, enabled state, and the close button.

<hr>

###### Input parameters

| Property   | Type           | Description                                                                                                                                       |
| ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Enabled`  | `Boolean`      | Enables or disables the close button. Disabled close controls are not clickable.                                                                  |
| `HasClose` | `Boolean`      | When `True`, renders a top-right close (`x`) button.                                                                                              |
| `Shape`    | `Shape`        | Corner style. `rounded` is a pill; `soft` uses an 8px radius; `none` removes rounding. Unknown values fall back to `rounded`.                     |
| `Size`     | `SapphireSize` | Icon size preset. Defaults to `m` (24px).                                                                                                         |
| `Theme`    | `Text`         | Optional theme tokens (space-separated). `light` uses tinted semantic backgrounds and dark text. Empty / omitted uses the solid semantic colours. |
| `Type`     | `Alert`        | Semantic variant. Icons and colours follow the shared `Alert` / `SapphireColor` list.                                                             |

<hr>

###### Placeholders

| Name      | Description                                                                               |
| --------- | ----------------------------------------------------------------------------------------- |
| `Content` | Main message area. Grows to fill remaining width so `Actions` sits at the end of the bar. |
| `Actions` | Optional trailing actions. Placed immediately after `Content`.                            |

<hr>

###### Events

| Name    | Description                             |
| ------- | --------------------------------------- |
| `Close` | Fired when the close button is clicked. |
