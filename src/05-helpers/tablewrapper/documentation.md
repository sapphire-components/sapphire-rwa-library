###### Overview

A layout helper that wraps a platform `Table` (or equivalent markup) placed in a placeholder. The table itself is not part of the helper: `TableWrapper` only controls scroll behaviour, sticky headers, loading, empty state, optional clickable rows, optional reorderable rows, and column width rules through CSS and JavaScript.

- The root (`.tablewrapper`) is the horizontal scroll container. When `MaxHeight` is set, it also becomes the vertical scroll container and pins the header cells (and pagination, when present) with `position: sticky`.
- `IsStickyHeader` enables a cloned header row that sticks to the top of the screen layout while the page scrolls. It is ignored when `MaxHeight` is set (internal scroll takes over).
- While `IsLoading` is `True`, the table is dimmed and a centered loading overlay is shown over the wrapper.
- When `PageCount` is `0` and the wrapper is no longer pristine, the **NoRecords** placeholder is shown. `IsPristine` keeps the empty state hidden before the first data load.
- `ColumnFixedWidths` applies fixed `table-layout` and honours `width-*` classes on cells; when off, those width classes are cleared.
- `Density` controls header and row compactness. Only `Compact` and `Default` from `SapphireDensity` are supported; other density values are not applied.
- When `HasPagination` is `True`, a pagination control is shown below the table (driven by `MaxRecords`, `StartIndex`, and `TotalCount`) and fires `PaginationNavigate` on page change. When `MaxHeight` is set, that control is pinned to the bottom of the internal scroll container.
- `data-rowid` on the `tr` is **not** sent by the server. The helper inspects every `td` in each body row; if any cell has `data-rowid`, that value is copied onto the `tr`. Click (`RowClick`) and Reorder (`RowsReordered`) both read the id from this `tr` attribute — not from the cells at event time.
- When `ClickableRows` is `True`, body rows become clickable and fire `RowClick` with that row's `tr` `data-rowid`. When no cell had `data-rowid` to copy, the event receives `"missing rowid"`. Clicks on interactive cell content (`a`, `button`, `input`, `select`, `textarea`, `label`, and common ARIA / editable roles) do not fire `RowClick`. Turning `ClickableRows` off removes the handlers.
- When `ReorderableRows` is `True`, every `tbody > tr` in the wrapped table can be dragged to a new position (hover cursor is `grab`). After a drop that changes order, `RowsReordered` fires with each row's `tr` `data-rowid` in the new visual order (JSON array string). Interactive cell content does not start a drag. A completed drag does not fire `RowClick`.

<hr>

###### Input parameters

| Name                | Type              | Description                                                                                                                                                                                                                                                                               |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClickableRows`     | `Boolean`         | When `True`, makes body rows clickable and fires `RowClick` with the `tr`'s `data-rowid` (copied from a `td[data-rowid]`). Interactive cell content does not trigger `RowClick`. When `False`, click handlers are removed.                                                                |
| `ColumnFixedWidths` | `Boolean`         | When `True`, uses fixed table layout and applies `width-*` size classes to columns. When `False`, those width classes are unset.                                                                                                                                                          |
| `Density`           | `SapphireDensity` | Visual density of header and body cells. Supported values: `Compact` (tighter padding, unsets the default 48px header/row height) and `Default` (standard size). Other `SapphireDensity` entries (`Dense`, `Comfortable`) are not used by this helper.                                    |
| `HasPagination`     | `Boolean`         | When `True`, shows the pagination control below the table (driven by `MaxRecords`, `StartIndex`, and `TotalCount`) and fires `PaginationNavigate` on page change. When `MaxHeight` is set, pagination is pinned to the bottom of the internal scroll. When `False`, pagination is hidden. |
| `Height`            | `Integer`         | Fixed height of the wrapper in pixels. When `0` / unset, height is not forced.                                                                                                                                                                                                            |
| `IsLoading`         | `Boolean`         | Shows a centered loading overlay and dims the table. Clearing loading also exits the pristine state.                                                                                                                                                                                      |
| `IsPristine`        | `Boolean`         | Marks the initial / untouched state. While pristine, an empty `PageCount` does not show the no-records UI.                                                                                                                                                                                |
| `IsStickyHeader`    | `Boolean`         | Pins a cloned header to the top of the screen layout on vertical page scroll. Disabled automatically when `MaxHeight` is set.                                                                                                                                                             |
| `MaxHeight`         | `Integer`         | Maximum height of the wrapper in pixels. When greater than `0`, enables internal vertical scroll with a sticky header (and sticky pagination). When `0`, no max-height.                                                                                                                   |
| `MaxRecords`        | `Integer`         | For pagination: Number of records per page                                                                                                                                                                                                                                                |
| `PageCount`         | `Integer`         | Record length for the current page. When 0 it displays the NoRecords placeholder. Otherwise, its always hidden                                                                                                                                                                            |
| `ReorderableRows`   | `Boolean`         | When `True`, body rows (`tbody > tr`) can be dragged to reorder. Hover shows a grab cursor. After a drop that changes order, `RowsReordered` fires with each row's `tr` `data-rowid` in the new order. Interactive cell content does not start a drag.                                    |
| `StartIndex`        | `Integer`         | For pagination: Set the initial index to start pagination                                                                                                                                                                                                                                 |
| `TotalCount`        | `Long Integer`    | For pagination: Total records of list                                                                                                                                                                                                                                                     |

<hr>

###### Placeholders

| Name        | Description                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `Table`     | The platform table to enhance. Not owned by the helper; styled and observed at runtime.                             |
| `NoRecords` | Empty-state content shown when there are no records after the first load (`PageCount` is `0` and not `IsPristine`). |

<hr>

###### Events

| Name                 | Description                                                                                                                                                                                                  | Arguments                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| `PaginationNavigate` | Event triggered on navigate. New start index value returned.                                                                                                                                                 | `NewStartIndex` (`Integer`) |
| `Reorder`            | Fired after a row is dropped in a new position. Each id is the `tr`'s `data-rowid` (copied from a `td[data-rowid]` when present). JSON array string, e.g. `["id-1","id-2"]`.                                 | `RowIds` (`Text List`)      |
| `RowClick`           | Fired when a clickable row is activated (not when the click target is interactive cell content). `RowId` is the `tr`'s `data-rowid`, copied from a `td[data-rowid]` in the row; otherwise `"missing rowid"`. | `RowId` (`Text`)            |
