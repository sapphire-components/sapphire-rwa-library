###### Overview

A compact status label for short text such as a category, state, or tag. It is a presentation-only component: color, optional leading status dot, and corner shape are driven by inputs; the label content comes from the `Content` placeholder.

- Default shape is a pill (`border-radius: 999px`). Use `Shape` to switch to rounded (`soft`) or square (`none`) corners.
- When `HasDot` is `True`, a small colored circle is rendered before the content, matching the selected `Color`.
- Color themes map to semantic surfaces: `neutral`, `info`, `success`, `warning`, and `error`.

<hr>

###### Input parameters

| Name      | Type            | Description                                                                                                      |
| --------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Color`   | `SapphireColor` | Semantic color theme. Supported values: `neutral`, `info`, `success`, `warning`, `error`.                        |
| `Enabled` | `Boolean`       | Enables or disables the badge visually / interactively as configured in the widget.                              |
| `HasDot`  | `Boolean`       | When `True`, shows a leading status dot tinted to match `Color`.                                                 |
| `Shape`   | `Shape`         | Corner style. Omit or leave default for a pill; `soft` uses a small radius; `none` removes rounding.             |
| `Width`   | `SapphireScale` | Width preset for the badge container (`auto`, `xs`–`xl7`, `full`, etc.).                                         |

<hr>

###### Placeholders

| Name      | Description                                      |
| --------- | ------------------------------------------------ |
| `Content` | Text or markup displayed inside the badge.       |
