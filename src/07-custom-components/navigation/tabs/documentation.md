###### Overview

A tabbed layout made of three widgets: `Tabs` (the shell), `TabHeader` (one header per tab), and `TabContent` (one panel per tab). Headers and panels are paired by **DOM order** (0-based). OutSystems block wrappers use `display: contents` so the flex layout is not broken by extra nodes.

- The shell (`.sapphire-tabs`) is a vertical flex column: header row (`.sapphire-tabs-header`) then content (`.sapphire-tabs-content`). Only the panel whose index matches `ActiveTab` is shown (`data-active='true'`); the others are `display: none`.
- Default appearance is underline tabs. `Theme` `button` uses rounded header chips; `pills` uses pill headers and **disables** overflow (the More control is removed from the DOM). Theme is applied as `data-theme` on the root.
- When headers do not fit (default and `button` themes), overflowing `TabHeader`s move into a More overlay (`Overlay` / Tippy) and get `is-overflowed` + `overlay-item`. The More control is marked `is-active` while the active tab is in that overflow list. Selecting a tab closes the overlay.
- Keyboard: the first header is in the tab order (`tabIndex` 0); the rest are `-1`. `Enter` / `Space` activate the focused header. `ArrowLeft` / `ArrowRight` move among **visible** headers and activate the target. In the More overlay, `ArrowUp` / `ArrowDown` move focus only (activate with `Enter` / `Space`).
- Each `TabHeader` unwraps its OutSystems parent so list items sit in the header flex row. Index is stored on `data-index` at init, so later overflow moves do not change pairing.
- `Height`, `MaxHeight`, and `MinHeight` are applied as inline `height` / `max-height` / `min-height` on `.sapphire-tabs`. `0` clears the inline style.
- `HasScroll` sets `data-hasscroll`. When `True`, `.sapphire-tabs-content` scrolls vertically (`overflow-y: auto`, thin scrollbar, stable gutter).
- `IsFullHeight` sets `data-isfullheight` and measures the content area’s viewport offset into `--tabs-content-top`. Content height is then `calc(100vh - var(--tabs-content-top) - var(--tabs-bottom-distance))`. Inside a `.popup-content`, height is `calc(var(--popupcontentfooter-top) - 8px - var(--tabs-content-top))` instead. `BottomDistance` writes `--tabs-bottom-distance` (page layout only; unused in the popup formula).
- `--tabs-content-top` is recalculated on widget resize and when `.layout` resizes. It is removed when `IsFullHeight` is `False`.
- Panel padding uses `--tabs-content-padding-block` (default `1rem`) and `--tabs-content-padding-inline` (default `0`).
- After init, `parametersChanged` updates `ActiveTab` (via `setTabIndex`, which fires `Change`), height CSS, `Enabled` / `HasScroll` / `IsFullHeight` attributes, overflow when `Theme` changes, and always remeasures `--tabs-content-top`.

<hr>

###### Input parameters

| Name            | Type      | Description                                                                                                                                                  |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ActiveTab`     | `Integer` | 0-based index of the selected tab. Reflected as `data-activetab` on the root. Updates after init call `setTabIndex` (fires `Change`, then re-renders).       |
| `BottomDistance`| `Integer` | Extra pixels reserved below the content when `IsFullHeight` is `True` on the page (not inside a popup). Written as `--tabs-bottom-distance`. `0` is `0px`.   |
| `Enabled`       | `Boolean` | Reflected as `data-enabled` on `.sapphire-tabs`. Header clicks and keyboard are not gated on this flag.                                                      |
| `HasScroll`     | `Boolean` | When `True`, sets `data-hasscroll="true"` so `.sapphire-tabs-content` scrolls vertically.                                                                     |
| `Height`        | `Integer` | Inline `height` on `.sapphire-tabs` in pixels. `0` leaves height unset.                                                                                       |
| `IsFullHeight`  | `Boolean` | When `True`, sets `data-isfullheight="true"` and sizes `.sapphire-tabs-content` to fill the remaining viewport (or popup body) as described above.            |
| `MaxHeight`     | `Integer` | Inline `max-height` on `.sapphire-tabs` in pixels. `0` leaves it unset.                                                                                       |
| `MinHeight`     | `Integer` | Inline `min-height` on `.sapphire-tabs` in pixels. `0` leaves it unset.                                                                                       |
| `Theme`         | `Text`    | Visual variant. Empty / default is underline tabs. `button` and `pills` are supported; if the value contains `pills`, overflow is turned off.                 |

<hr>

###### Events

| Name     | Description                                                                                                                         | Arguments                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `Change` | Fired when the active tab changes (header click / keyboard, or `ActiveTab` from outside). Outside updates pass an empty identifier. | `Identifier` (`Text`), `TabIndex` (`Integer`), `TabIdentifier` (`Text`) |

<hr>

###### `TabHeader`

One clickable header. Nest these in the `Tabs` header list. The widget root is `.sapphire-tabheader`; the label lives in `.sapphire-tabheader-content`. Active state is `data-active` on the header (underline / chip / pill colour comes from CSS). Overflowed headers drop the underline while they sit in the More list.

Input parameters:

| Name         | Type      | Description                                                                               |
| ------------ | --------- | ----------------------------------------------------------------------------------------- |
| `Enabled`    | `Boolean` | Widget input; not currently applied by the `TabHeader` script.                            |
| `Identifier` | `Text`    | Stable id emitted as `TabIdentifier` on `Tabs.Change` when this header activates the tab. |

Placeholders:

| Name      | Description                                     |
| --------- | ----------------------------------------------- |
| `Content` | Label (text, icon, or markup) shown in the tab. |

<hr>

###### `TabContent`

One panel. Nest these in the `Tabs` content area, in the **same order** as the headers. The widget root is `.sapphire-tabcontent`; visibility is driven by `Tabs` (`display: none` unless `data-active='true'`).

Input parameters:

| Name      | Type      | Description                                              |
| --------- | --------- | -------------------------------------------------------- |
| `Enabled` | `Boolean` | Widget input; not currently applied by the `TabContent` script. |

Placeholders:

| Name      | Description            |
| --------- | ---------------------- |
| `Content` | Body of the tab panel. |
