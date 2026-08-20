###### Overview

A layout helper that wraps a platform `Table` (or equivalent markup) placed in a placeholder. The table itself is not part of the helper: `TableWrapper` only controls scroll behaviour, sticky headers, loading, empty state, optional clickable rows, and column width rules through CSS and JavaScript.

- The root (`.tablewrapper`) is the horizontal scroll container. When `MaxHeight` is set, it also becomes the vertical scroll container and pins the header cells (and pagination, when present) with `position: sticky`.
- `IsStickyHeader` enables a cloned header row that sticks to the top of the screen layout while the page scrolls. It is ignored when `MaxHeight` is set (internal scroll takes over).
- While `IsLoading` is `True`, the table is dimmed and a centered loading overlay is shown over the wrapper.
- When `PageCount` is `0` and the wrapper is no longer pristine, the **NoRecords** placeholder is shown. `IsPristine` keeps the empty state hidden before the first data load.
- `ColumnFixedWidths` applies fixed `table-layout` and honours `width-*` classes on cells; when off, those width classes are cleared.
- When `ClickableRows` is `True`, body rows become clickable and fire `RowClick` with the first `data-rowid` found on a cell in that row. When no cell has `data-rowid`, the event receives `"missing rowid"`. Clicks on interactive cell content (`a`, `button`, `input`, `select`, `textarea`, `label`, and common ARIA / editable roles) do not fire `RowClick`. Turning `ClickableRows` off removes the handlers.

<hr>

###### Input parameters

| Name                | Type              | Description                                                                                                                                                             |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClickableRows`     | `Boolean`         | When `True`, makes body rows clickable and fires `RowClick` with the row id from the first `td[data-rowid]`. Interactive cell content does not trigger `RowClick`. When `False`, click handlers are removed. |
| `ColumnFixedWidths` | `Boolean`         | When `True`, uses fixed table layout and applies `width-*` size classes to columns. When `False`, those width classes are unset.                                        |
| `Density`           | `SapphireDensity` |                                                                                                                                                                         |
| `HasPagination`     | `Boolean`         |                                                                                                                                                                         |
| `Height`            | `Integer`         | Fixed height of the wrapper in pixels. When `0` / unset, height is not forced.                                                                                          |
| `IsLoading`         | `Boolean`         | Shows a centered loading overlay and dims the table. Clearing loading also exits the pristine state.                                                                    |
| `IsPristine`        | `Boolean`         | Marks the initial / untouched state. While pristine, an empty `PageCount` does not show the no-records UI.                                                              |
| `IsStickyHeader`    | `Boolean`         | Pins a cloned header to the top of the screen layout on vertical page scroll. Disabled automatically when `MaxHeight` is set.                                           |
| `MaxHeight`         | `Integer`         | Maximum height of the wrapper in pixels. When greater than `0`, enables internal vertical scroll with a sticky header (and sticky pagination). When `0`, no max-height. |
| `MaxRecords`        | `Integer`         | For pagination: Number of records per page                                                                                                                              |
| `PageCount`         | `Integer`         | Record length for the current page. When 0 it displays the NoRecords placeholder. Otherwise, its always hidden                                                          |
| `StartIndex`        | `Integer`         | For pagination: Set the initial index to start pagination                                                                                                               |
| `TotalCount`        | `Long Integer`    | For pagination: Total records of list                                                                                                                                   |

<hr>

###### Placeholders

| Name        | Description                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `Table`     | The platform table to enhance. Not owned by the helper; styled and observed at runtime.                             |
| `NoRecords` | Empty-state content shown when there are no records after the first load (`PageCount` is `0` and not `IsPristine`). |

<hr>

###### Events

| Name                 | Description                                                                                                                                      | Arguments                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| `PaginationNavigate` | Event triggered on navigate. New start index value returned.                                                                                     | `NewStartIndex` (`Integer`) |
| `RowClick`           | Fired when a clickable row is activated (not when the click target is interactive cell content). Provide a `data-rowid` on at least one `td` in the row; otherwise the argument is `"missing rowid"`. | `RowId` (`Text`)            |
