###### Overview

A compact status label for short text such as a category, state, or tag. It is a presentation-only component: color, optional leading status dot, and corner shape are driven by inputs; the label content comes from the `Content` placeholder. `Color` is a `SapphireColor` value; `Shape` is a `Shape` value that controls corner radius.

- Default shape is a pill (`border-radius: 999px`). Use `Shape` to switch to rounded (`soft`) or square (`none`) corners.
- When `HasDot` is `True`, a small colored circle is rendered before the content, matching the selected `Color`.
- Color themes map to semantic `SapphireColor` surfaces: `neutral`, `info`, `success`, `warning`, and `error`.
- `Config` takes custom colors and label text, for migrating from the previous badge component. Each field that has a value overrides its input; empty fields fall back to `Color` and the `Content` placeholder.

<hr>

###### Input parameters

| Name      | Type            | Description                                                                                          |
| --------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `Color`   | `SapphireColor` | Semantic color theme.                                                                                |
| `Config`  | `BadgeConfig`   | Optional overrides. See [Config](#config).                                                           |
| `Enabled` | `Boolean`       | Enables or disables the badge visually / interactively as configured in the widget.                  |
| `HasDot`  | `Boolean`       | When `True`, shows a leading status dot tinted to match `Color`.                                     |
| `Shape`   | `Shape`         | Corner style. Omit or leave default for a pill; `soft` uses a small radius; `none` removes rounding. |
| `Width`   | `SapphireScale` | Width preset for the badge container (`auto`, `xs`–`xl7`, `full`, etc.).                             |

<hr>

###### Placeholders

| Name      | Description                                |
| --------- | ------------------------------------------ |
| `Content` | Text or markup displayed inside the badge. |

<hr>

###### Config

Every field is optional. Colors accept any CSS color, such as `#ff0000`, `red`, or `rgb(255, 0, 0)`.

| Field             | Overrides                       | When empty                                                        |
| ----------------- | ------------------------------- | ----------------------------------------------------------------- |
| `LabelText`       | The `Content` placeholder       | `Content` is shown.                                               |
| `LabelColor`      | Text color                      | The `Color` theme's text color.                                   |
| `BackgroundColor` | Background color                | The `Color` theme's background.                                   |
| `BadgeColor`      | Icon color and the `HasDot` dot | The icon inherits the text color; the dot uses the `Color` theme. |
