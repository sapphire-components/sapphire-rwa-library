###### Overview

A tabbed layout made of three widgets: `Tabs` (the shell), `TabHeader` (one header per tab), and `TabContent` (one panel per tab). Headers and panels are paired by **DOM order** (0-based). OutSystems block wrappers use `display: contents` so the flex layout is not broken by extra nodes.

- The shell (`.sapphire-tabs`) has a header row (`.sapphire-tabs-header`) and a content area (`.sapphire-tabs-content`). Only the panel whose index matches `ActiveTab` is shown (`data-active='true'`); the others are hidden.
- Default appearance is underline tabs. `Theme` `button` uses rounded header chips; `pills` uses pill headers and **disables** overflow (the More control is removed).
- When headers do not fit (default and `button` themes), overflowing `TabHeader`s move into a More overlay (`Overlay` / Tippy). The More control is marked `is-active` while the active tab is in that overflow list. Selecting a tab closes the overlay.
- Keyboard: the first header is in the tab order (`tabIndex` 0); the rest are `-1`. `Enter` / `Space` activate the focused header. `ArrowLeft` / `ArrowRight` move among **visible** headers and activate the target. In the More overlay, `ArrowUp` / `ArrowDown` move focus only (activate with `Enter` / `Space`).
- Each `TabHeader` unwraps its OutSystems parent so list items sit in the header flex row. Index is stored on `data-index` at init, so later overflow moves do not change pairing.
- After init, only `ActiveTab` is observed on `Tabs`. Height inputs are construction-time.

<hr>

###### Input parameters

| Name        | Type      | Description                                                                                                                                     |
| ----------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ActiveTab` | `Integer` | 0-based index of the selected tab. Updates after init call `setTabIndex` (fires `Change`, then re-renders).                                     |
| `Enabled`   | `Boolean` | Enables or disables the widget visually / interactively as configured in the widget.                                                            |
| `Height`    | `Integer` | Sets `--tabs-height` on the root in pixels. `0` leaves it unset.                                                                                |
| `MaxHeight` | `Integer` | Sets `--tabs-max-height` on the root (applied as `max-height` on `.sapphire-tabs-content`). `0` leaves it unset.                                |
| `MinHeight` | `Integer` | Sets `--tabs-min-height` on the root in pixels. `0` leaves it unset.                                                                            |
| `Theme`     | `Text`    | Visual variant. Empty / default is underline tabs. `button` and `pills` are supported; if the value contains `pills`, overflow is turned off.   |

<hr>

###### Events

| Name     | Description                                                                                                                          | Arguments                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `Change` | Fired when the active tab changes (header click / keyboard, or `ActiveTab` from outside). Outside updates pass an empty identifier. | `Identifier` (`Text`), `TabIndex` (`Integer`), `TabIdentifier` (`Text`)    |

<hr>

###### `TabHeader`

One clickable header. Nest these in the `Tabs` header list. The widget root is `.sapphire-tabheader`; the label lives in `.sapphire-tabheader-content`.

Input parameters:

| Name         | Type      | Description                                                                               |
| ------------ | --------- | ----------------------------------------------------------------------------------------- |
| `Enabled`    | `Boolean` | Enables or disables the header visually / interactively as configured in the widget.      |
| `Identifier` | `Text`    | Stable id emitted as `TabIdentifier` on `Tabs.Change` when this header activates the tab. |

Placeholders:

| Name      | Description                                     |
| --------- | ----------------------------------------------- |
| `Content` | Label (text, icon, or markup) shown in the tab. |

<hr>

###### `TabContent`

One panel. Nest these in the `Tabs` content area, in the **same order** as the headers. The widget root is `.sapphire-tabcontent`; visibility is driven by `Tabs` (`display: none` unless `data-active='true'`).

Input parameters:

| Name      | Type      | Description                                                                         |
| --------- | --------- | ----------------------------------------------------------------------------------- |
| `Enabled` | `Boolean` | Enables or disables the panel visually / interactively as configured in the widget. |

Placeholders:

| Name      | Description            |
| --------- | ---------------------- |
| `Content` | Body of the tab panel. |
