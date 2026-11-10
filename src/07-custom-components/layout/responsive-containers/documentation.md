###### Overview

Arranges its children into responsive columns, either as a CSS grid or as a masonry (multi-column) flow.

- `Layout` selects the mode. `grid` uses CSS Grid. `masonry` uses CSS multi-column layout.
- `Columns` locks the column count for both modes and ignores container width. `0` leaves the count to `MinColWidth`.
- `MinColWidth` is the minimum column size, in pixels, used only when `Columns` is `0`. In `grid` it feeds `minmax(MinColWidth, 1fr)` with `auto-fit`, so the column count grows and shrinks with the container width. In `masonry` it is the `columns` width, so the browser packs as many columns of that width as fit.
- `Gap` is the space between items, as a `SapphireSize` spacing step (`none`, `xs3`, `xs2`, `xs`, `s`, `base`, `m`, `l`, `xl`, `xl2`, `xl3`, `xl4`) mapped to the matching `--space-*` token. Defaults to `m` (24px). Empty or unsupported values fall back to `m`. In `grid` it is the grid gap. In `masonry`, `column-gap` spaces the columns and each item's bottom margin spaces the cards stacked in a column. Multi-column layout does not apply `row-gap`.
- Each child container gets `break-inside: avoid` in `masonry`, so an item stays in one column.
- Direct children of the content placeholder become items (`.responsive-container-item`). If the placeholder contains a single OutSystems List (`.list.list-group`), the list wrapper is unwrapped with `display-contents` so each list row becomes an item.

<hr>

###### Input parameters

| Name            | Type           | Description                                                                                                                                                    |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Columns`       | `Integer`      | Fixed column count for `grid` and `masonry`. Ignores available width. `0` (default) uses `MinColWidth` instead.                                                 |
| `ExtendedClass` | `Text`         | Extra CSS classes added to the component root, separated by spaces.                                                                                            |
| `Gap`           | `SapphireSize` | Space between items. Spacing steps `none` to `xl4`. Defaults to `m` (24px). In `grid` this is the grid gap. In `masonry` it spaces columns and stacked cards.   |
| `Identifier`    | `Text`         | Optional identifier, rendered as `data-identifier` on the component root.                                                                                      |
| `Layout`        | `Layout`       | `Grid` (default) or `Masonry`.                                                                                                                                 |
| `MinColWidth`   | `Integer`      | Minimum column width, in pixels. Used when `Columns` is `0`. Defaults to `320`. Drives `minmax` in `grid` and the `columns` width in `masonry`. Capped at the container width. |
| `Theme`         | `Text`         | Optional space-separated theme tokens, rendered as `data-theme` on the component root.                                                                         |

<hr>

###### Placeholders

| Name         | Description                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `Containers` | Elements to place in the layout. Each direct child becomes an item. A single List inside is unwrapped so its rows are the items. |
