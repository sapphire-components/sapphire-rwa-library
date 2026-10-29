###### Overview

A single row of filters that hides what does not fit behind a **+N See more** button. The button opens a panel with every filter.

- Filters in `Always` are always shown on the row.
- Filters in `Maybe` are shown on the row, in order, while they fit. The first one that does not fit, and every one after it, is hidden from the row.
- Filters in `Never` are only shown in the panel.
- The button appears at the end of the row, just before `Actions`, only when something is hidden. `N` counts the hidden `Maybe` filters plus every `Never` filter.
- The panel covers the row and holds all filters in their original order (`Always`, `Maybe`, `Never`), with an **Apply** button at the bottom when `HasApplyButton` is `True`. It opens downwards and flips upwards when there is not enough room below. The row keeps its height while the panel is open, so the rest of the screen does not move.
- The panel closes on Apply, on a click outside it, or on Esc. Clicks inside dropdowns and date pickers opened from a filter do not close it.
- The row is recalculated when the component is resized and when filters are added or removed.
- When `Enabled` is `False`, the button and the Apply button do not accept input.

<hr>

###### Input parameters

| Name            | Type            | Description                                                                 |
| --------------- | --------------- | --------------------------------------------------------------------------- |
| `Density`       | `SapphireDensity` | Padding of the row and the panel: `Default` 24px, `Compact` 16px, `Dense` 8px. |
| `Enabled`       | `Boolean`       | Enables or disables the See more and Apply buttons.                        |
| `ExtendedClass` | `Text`          | Extra classes added to the component root.                                  |
| `IsSticky`      | `Boolean`       | When `True`, the row stays pinned at the top of the scroll area once it scrolls past it, below any other sticky components above it (BackofficeHeader, FilterBar...). |
| `HasApplyButton` | `Boolean`      | When `True`, the panel shows the Apply button at the bottom. Defaults to `True`. |
| `Identifier`    | `Text`          | Optional identifier passed on the emitted events.                           |
| `TextApply`     | `Text`          | Label of the Apply button in the panel. Defaults to `Apply`.                |
| `TextSeeMore`   | `Text`          | Label of the button that opens the panel, shown after `+N`. Defaults to `See more`. |
| `Theme`         | `Text`          | Theme applied to the component and the panel.                               |
| `Width`         | `SapphireScale` | Component width.                                                            |

<hr>

###### Placeholders

| Name     | Description                                              |
| -------- | -------------------------------------------------------- |
| `Always` | Filters that are always shown on the row.                |
| `Maybe`  | Filters shown on the row while they fit, otherwise only in the panel. |
| `Never`  | Filters shown only in the panel.                         |
| `Actions` | Permanent buttons at the end of the row, after **See more**. Their width is reserved before `Maybe` filters are fitted. They stay on the row and are not moved into the panel. |

<hr>

###### Events

| Name     | Description                                              | Arguments                                   |
| -------- | -------------------------------------------------------- | ------------------------------------------- |
| `Apply`  | Fired when Apply is clicked, before the panel closes.    | `Identifier` (`Text`)                       |
| `Toggle` | Fired when the panel opens or closes.                    | `Identifier` (`Text`), `IsOpen` (`Boolean`) |
