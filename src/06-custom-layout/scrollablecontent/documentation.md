###### Overview

A vertical content layout with a fixed header, a scrollable body, and an optional three-column footer. Use it when you need a constrained-height region where only the body scrolls — for example inside overlays, side panels, or custom dialogs.

- The component renders a vertical flex layout: **Header** (fixed), **Body** (scrollable), and **Footer** (fixed, three columns).
- `Height` and `MaxHeight` set the container size in pixels. When content exceeds the available height, only the **Body** scrolls.
- The body uses a thin scrollbar with a stable gutter so layout does not shift when the scrollbar appears.
- An empty **Header** is hidden. The **Footer** stays in the layout as a three-column grid (`FooterLeft` / `FooterCenter` / `FooterRight`).

<hr>

###### Input parameters

| Name        | Type            | Description                                                                                                         |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Enabled`   | `Boolean`       | Enables or disables the component visually / interactively as configured in the widget.                             |
| `Height`    | `Text`          | Fixed height of the container in pixels. When empty / unset, height is not forced and content can grow naturally.   |
| `MaxHeight` | `Integer`       | Maximum height of the container in pixels. When `0`, no max-height is applied.                                      |
| `Width`     | `SapphireScale` | Width preset for the container (`auto`, `xs`–`xl7`, `full`, etc.).                                                  |

<hr>

###### Placeholders

| Name           | Description                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `Header`       | Top section for a title or custom content. Hidden when empty.                                     |
| `Body`         | Main scrollable content area. Grows to fill remaining space between header and footer.            |
| `FooterLeft`   | Left-aligned content in the footer grid (e.g. secondary actions).                                 |
| `FooterCenter` | Center-aligned content in the footer grid.                                                        |
| `FooterRight`  | Right-aligned content in the footer grid (e.g. primary actions).                                  |
