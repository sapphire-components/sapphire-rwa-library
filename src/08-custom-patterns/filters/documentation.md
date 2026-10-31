###### Overview

A single row of filters that hides what does not fit behind a **+N See more** button. The button opens a panel with every filter.

- Filters in `Always` are always shown on the row.
- Filters in `Maybe` are shown on the row, in order, while they fit. The first one that does not fit, and every one after it, is hidden from the row.
- Filters in `Never` are only shown in the panel.
- The button appears at the end of the row, just before `Actions`, only when something is hidden. `N` counts the hidden `Maybe` filters plus every `Never` filter.
- The panel covers the row and holds all filters in their original order (`Always`, `Maybe`, `Never`), with an **Apply** button at the bottom when `HasApplyButton` is `True`. It opens downwards and flips upwards when there is not enough room below. The row keeps its height while the panel is open, so the rest of the screen does not move.
- The panel closes on Apply, on a click outside it, or on Esc. Clicks inside dropdowns and date pickers opened from a filter do not close it.
- The row is recalculated when the component is resized and when filters are added or removed.
- When `Enabled` is `False`, the See more, Clear and Apply buttons do not accept input.
- When `HasClear` is `True`, a **Clear** button shows while any filter is active: on the row between See more and `Actions`, and at the bottom left of the panel. It fires `Clear` and does not change any value itself, so reset the filter variables in the handler. The panel stays open.
- A filter with a value is shown as active, with a primary lighter background, on the row and in the panel. Supported: `SapphireDropdown`, `SapphireInput`, plain platform `Input` widgets (text, number, email, date...) and `Dropdown` widgets (active unless the Empty Text option is selected, so set an Empty Text).
- When hidden filters are active, the See more button shows their count in a red badge, e.g. **+2 See more (1)**. A `CheckboxLabel` with its checkbox ticked also counts as active.

<hr>

###### Input parameters

| Name            | Type            | Description                                                                 |
| --------------- | --------------- | --------------------------------------------------------------------------- |
| `Density`       | `SapphireDensity` | Padding of the row and the panel: `Default` 24px, `Compact` 16px, `Dense` 8px. |
| `Enabled`       | `Boolean`       | Enables or disables the See more, Clear and Apply buttons.                 |
| `ExtendedClass` | `Text`          | Extra classes added to the component root.                                  |
| `IsSticky`      | `Boolean`       | When `True`, the row stays pinned at the top of the scroll area once it scrolls past it, below any other sticky components above it (BackofficeHeader, FilterBar...). |
| `HasApplyButton` | `Boolean`      | When `True`, the panel shows the Apply button at the bottom. Defaults to `True`. |
| `HasClear`      | `Boolean`       | When `True`, shows the Clear button while any filter is active. Defaults to `False`. |
| `Identifier`    | `Text`          | Optional identifier passed on the emitted events.                           |
| `TextApply`     | `Text`          | Label of the Apply button in the panel. Defaults to `Apply`.                |
| `TextClear`     | `Text`          | Label of the Clear button. Defaults to `Clear`.                             |
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
| `Clear`  | Fired when Clear is clicked. Reset the filter variables here. | `Identifier` (`Text`)              |
| `Toggle` | Fired when the panel opens or closes.                    | `Identifier` (`Text`), `IsOpen` (`Boolean`) |
