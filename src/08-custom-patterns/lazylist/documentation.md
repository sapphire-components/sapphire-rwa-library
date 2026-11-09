###### Overview

A scrollable list that keeps one page of rows in the DOM and asks for the next page as the user scrolls. `LazyListRow` is one row of that page. With `SimulateTable`, the header and each row line up as columns, and a header column can sort.

- The root (`.lazylist`) is the scroll container. **Header** stays pinned to the top. **Rows** holds the current page. **NoRecords** is the empty state.
- `Height` and `MaxHeight` size the list in pixels. When both are `0`, the list fills the viewport from its top edge to the bottom of the screen, minus `BottomDistance`. Resizing the window or the layout measures that height again.
- `ItemsTotal` is the full record count. **Rows** is one page, starting at `StartIndex`. Put a platform List in **Rows**, and only that page in the List. Each item is a `LazyListRow`. Spacers above and below the page stand in for the records that are not rendered, so the scrollbar matches `ItemsTotal`.
- Row height is measured from the rendered page and then kept. Keep rows a consistent height so the scroll position lines up with `StartIndex`.
- The page size is the number of rows that fill the visible area, plus one. It grows by one more row, up to five, while a skeleton is still visible. `Scroll` fires 200ms after scrolling settles, with the start index of the first row at the top of the scroll and that page size. Near the end of the list, that index moves back so the page stays full. Replace the page and set `StartIndex` to the index from the event. `Scroll` also fires when a resize means the current page no longer covers the list. It stays quiet when the loaded rows already cover the visible area, when `Enabled` is `False`, when the List has no rows, or when `ItemsTotal` is `0`.
- Skeletons stand in for the records above and below the loaded page. While `IsLoading` is `True`, a loading overlay covers the visible area, the rows do not accept input, and sorting is blocked.
- When `IsPristine` is `False`, `ItemsTotal` is `0`, and the List has no rows, **NoRecords** is shown. The header stays, dimmed, and does not accept input. `IsPristine` defaults to `True`, which keeps the empty state hidden before the first load.
- When `SimulateTable` is `False`, `Gap` is the space between rows. Half of it sits above each row's content and half below, so a separator falls in the middle. `none` and an empty value add no space.
- When `SimulateTable` is `True`, the header and each row are one line of columns. Use one Container per column, in the same order, in the header and in the row. A header Container with `data-sort="true"` and `data-column` set to a sort key gets a caret button. `Gap` is ignored.
- Clicking that column cycles it through `ASC`, `DESC`, and no sort, scrolls the list to the top, and fires `Sort`. `ASC` highlights the down caret. `DESC` highlights the up caret. A click on a link, button, input, select, or textarea inside the cell leaves the sort unchanged. The caret button itself sorts. After the click, the header keeps that column and direction. A different `SortColumn` or `SortDirection` from the parent is ignored until those inputs come back as the clicked values, `IsLoading` is `False`, and the list is not waiting on a `Scroll` page.
- When `Enabled` is `False`, sorting is blocked and further pages are not requested.

<hr>

###### Input parameters

| Name             | Type      | Description                                                                                                                                                                                                      |
| ---------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BottomDistance` | `Integer` | Pixels reserved under the list when it fills the viewport (`Height` and `MaxHeight` are both `0`). `0` reserves nothing.                                                                                         |
| `Enabled`        | `Boolean` | Enables header sorting and further `Scroll` requests.                                                                                                                                                            |
| `Gap`            | `Text`    | Space between rows when `SimulateTable` is `False`: `none`, `xxxs`, `xxs`, `xs`, `s`, `base`, `m`, `l`, `xl`, `xl2`, `xl3`. Half is padding above the row content and half below. Empty or `none` adds no space. |
| `HasSeparator`   | `Boolean` | When `True`, each row has a top border and the first row has none. When `False`, rows have no border.                                                                                                            |
| `Height`         | `Integer` | Fixed height in pixels. `0` leaves the height unset.                                                                                                                                                             |
| `IsLoading`      | `Boolean` | When `True`, covers the visible area with a loading overlay, blocks the rows, and blocks sorting.                                                                                                                |
| `IsPristine`     | `Boolean` | While `True`, an empty list does not show **NoRecords**. Defaults to `True`. Set it to `False` after the first load.                                                                                             |
| `ItemsTotal`     | `Integer` | Total number of records. Sizes the scrollbar. `0` means the list is empty and `Scroll` is not requested.                                                                                                         |
| `MaxHeight`      | `Integer` | Maximum height in pixels. `0` applies no cap. Above `0`, the list scrolls inside that cap.                                                                                                                       |
| `PageSize`       | `Integer` | Initial page size, read once at startup. After the rows are measured, the fitted size replaces it and later changes are ignored. Fetch the `PageSize` from `Scroll`.                                             |
| `SimulateTable`  | `Boolean` | When `True`, lays the header and rows out as aligned columns and enables header sorting.                                                                                                                         |
| `SortColumn`     | `Text`    | `data-column` of the sorted header. Empty means no column is sorted.                                                                                                                                             |
| `SortDirection`  | `Text`    | `ASC`, `DESC`, or empty. Empty clears the highlight.                                                                                                                                                             |
| `StartIndex`     | `Integer` | Index of the first record in the current page. Set this to the `StartIndex` from `Scroll` when that page arrives.                                                                                                |

<hr>

###### Placeholders

| Name        | Description                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `Header`    | Column titles. Stays pinned to the top of the list. Hidden when empty. In table mode, each Container is a column. |
| `Rows`      | The current page. Holds a platform List of `LazyListRow` items.                                                   |
| `NoRecords` | Empty state shown when `IsPristine` is `False`, `ItemsTotal` is `0`, and the List has no rows.                    |

<hr>

###### Events

| Name     | Description                                                                                                                                                                                      | Arguments                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `Scroll` | Fired 200ms after scrolling settles on a gap, and when a resize leaves a gap. Load `PageSize` records from `StartIndex`, then pass that index back.                                              | `StartIndex` (`Integer`), `PageSize` (`Integer`) |
| `Sort`   | Fired when a sortable header column is clicked. `Column` is that column's `data-column`. `Direction` is `ASC`, `DESC`, or empty when the sort is cleared. Load the first page for the new order. | `Column` (`Text`), `Direction` (`Text`)          |

<hr>

###### `LazyListRow`

One row in the **Rows** list. The widget root is `.lazylist-row`. When `HasSeparator` is `True`, the row has a top border, and the first row has none. There is no script and there are no events.

When `SimulateTable` is `True`, each Container in the row is a column and lines up with the header Container in the same position. The row highlights on hover. Columns share the width equally. Add the same width class to the header Container and the matching row Container to change that column's share of the row.

| Class        | Description                   |
| ------------ | ----------------------------- |
| `width-025x` | Quarter of a default column.  |
| `width-05x`  | Half of a default column.     |
| `width-2x`   | Twice a default column.       |
| `width-3x`   | Three times a default column. |
| `width-4x`   | Four times a default column.  |
| `width-5x`   | Five times a default column.  |
