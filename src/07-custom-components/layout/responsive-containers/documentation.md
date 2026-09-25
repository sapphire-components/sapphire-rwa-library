###### Overview

Arranges its children into responsive columns, either as a CSS grid or as a masonry (multi-column) flow.

- `Layout` selects the mode. `grid` uses CSS Grid. `masonry` uses CSS multi-column layout.
- `MinColWidth` is the minimum column size, in pixels. In `grid` it feeds `minmax(MinColWidth, 1fr)` with `auto-fit`, so the column count grows and shrinks with the container width. In `masonry` it is the `columns` width, so the browser packs as many columns of that width as fit.
- `Gap` is the space between items, in pixels. In `grid` it is the grid gap. In `masonry`, `column-gap` spaces the columns and each item's bottom margin spaces the cards stacked in a column. Multi-column layout does not apply `row-gap`.
- Each child container gets `break-inside: avoid` in `masonry`, so an item stays in one column.
- Direct children of the content placeholder become items (`.responsive-container-item`). If the placeholder contains a single OutSystems List (`.list.list-group`), the list wrapper is unwrapped with `display-contents` so each list row becomes an item.

<hr>

###### Input parameters

| Name           | Type      | Description                                                                                                      |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `Gap`          | `Integer` | Space between items, in pixels. In `grid` this is the grid gap. In `masonry` it spaces columns and stacked cards. |
| `Layout`       | `Text`    | `grid` or `masonry`.                                                                                             |
| `MinColWidth`  | `Integer` | Minimum column width, in pixels. Drives `minmax` in `grid` and the `columns` width in `masonry`.                 |

<hr>

###### Placeholders

| Name         | Description                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `Containers` | Elements to place in the layout. Each direct child becomes an item. A single List inside is unwrapped so its rows are the items. |
