###### Overview

A CSS Grid layout that arranges its children into responsive columns. By default it auto-fits as many columns as fit the available width given a minimum column size; you can also force a fixed column count.

- The root (`.responsive-grid`) is a CSS Grid. Column sizing uses `minmax(MinColWidth, 1fr)` with `auto-fit`, so the number of columns grows or shrinks with the container width.
- When `ForcedColumns` is greater than `0`, the grid uses that exact column count instead of `auto-fit`.
- `GridGap` sets the gap between cells (in pixels). `MaxColWidth`, when greater than `0`, caps each item's maximum width.
- Direct children of the content placeholder become grid items (`.responsive-grid-item`). Nested `.card-basic` elements stretch to the full item height.
- If the placeholder contains a single OutSystems List (`.list.list-group`), the list wrapper is unwrapped with `display-contents` so each list row becomes a grid item instead of the list itself.

<hr>

###### Input parameters

| Name            | Type      | Description                                                                                                                              |
| --------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ForcedColumns` | `Integer` | Fixed number of columns. When `0` (or unset), columns are auto-fitted from `MinColWidth`. When `> 0`, that many columns are always used. |
| `GridGap`       | `Integer` | Gap between grid cells, in pixels.                                                                                                       |
| `MaxColWidth`   | `Integer` | Maximum width of each grid item, in pixels. When `0` (or unset), items have no max-width cap.                                            |
| `MinColWidth`   | `Integer` | Minimum width used for column sizing (`minmax`), in pixels. Drives how many columns fit when `ForcedColumns` is `0`.                     |

<hr>

###### Placeholders

| Name         | Description                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `Containers` | Elements to place in the grid. Each direct child becomes a cell. A single List inside is unwrapped so its rows are the cells. |
