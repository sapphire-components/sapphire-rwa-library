###### Overview

A bordered card with a header, a body, and a three-part footer. The header can expand and collapse the body, and can show favorite and selectable icons.

- The root (`.sapphirecard`) is a vertical flex layout: **Header** (fixed), **Content**, and **Footer** (fixed).
- When `HasExpandable` is `True` and `IsOpen` is `False`, only the **Header** is visible. `IsOpen` `True` shows the **Header**, **Content**, and **Footer**.
- When `HasExpandable` is `False`, the **Header**, **Content**, and **Footer** stay visible regardless of `IsOpen`. Header clicks do not toggle the card.
- Clicking the **Header** toggles `IsOpen` and fires `ToggleOpen` with the new value. Clicks on buttons, links, checkboxes, labels, the action placeholders, or the capability icons do not toggle the card. `parametersChanged` can set `IsOpen` without firing `ToggleOpen`.
- `Enabled` `False` blocks header toggle and the capability icon clicks.
- When `HasFavorite` is `True`, a `star` icon is placed at the start of the **Header** (`star-full` when `IsFavorite` is `True`). Clicking it fires `ToggleFavorite`. When `HasSelectable` is `True`, a `square` icon is stacked under it (`check-square` when `IsSelected` is `True`). Clicking it fires `ToggleSelect`. The icon stack is removed when both flags are `False`.
- **ActionsWhenOpen** is shown while the body is visible (open, or not expandable). **ActionsWhenClosed** is shown only while an expandable card is closed. Both sit at the end of the **Header** (right in LTR, left in RTL).
- `Height` and `MaxHeight` apply while the body is visible. Only **Content** scrolls. A closed expandable card stays the height of its header.
- `Density` sets the padding on **Header**, **Content**, and **Footer**. All `SapphireDensity` values are supported. An unknown value falls back to `default`.
- `Theme` is written to `data-theme` on the root and updated from `parametersChanged`. An empty theme removes the attribute. `header-align-top` aligns the header to the top.
- **FooterLeft**, **FooterCenter**, and **FooterRight** size to their content. Left content stays on the left, center content stays centered, and right content stays on the right. A center-only footer stays centered because the empty side placeholders take no width.

<hr>

###### Input parameters

| Name            | Type              | Description                                                                                                                                                          |
| --------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Density`       | `SapphireDensity` | Padding of the header, content, and footer. `dense` is 4px, `compact` is 8px, `default` is 16px, `comfortable` is 24px. Unknown values fall back to `default`.     |
| `Enabled`       | `Boolean`         | Enables or disables header toggle and the favorite / selectable icon clicks.                                                                                        |
| `HasExpandable` | `Boolean`         | When `True`, a header click toggles the body. When `False`, header, content, and footer stay visible and the header does not toggle.                                |
| `HasFavorite`   | `Boolean`         | When `True`, shows the favorite icon at the start of the header.                                                                                                    |
| `HasSelectable` | `Boolean`         | When `True`, shows the selectable icon under the favorite icon.                                                                                                     |
| `Height`        | `Integer`         | Fixed height in pixels while the body is visible. When `0`, height is not forced.                                                                                   |
| `IsFavorite`    | `Boolean`         | Favorite state. `True` shows `star-full`; `False` shows `star`. Updated from outside without firing `ToggleFavorite`.                                               |
| `IsOpen`        | `Boolean`         | Open state of an expandable card. Updated from outside without firing `ToggleOpen`.                                                                                 |
| `IsSelected`    | `Boolean`         | Selected state. `True` shows `check-square`; `False` shows `square`. Updated from outside without firing `ToggleSelect`.                                            |
| `MaxHeight`     | `Integer`         | Maximum height in pixels while the body is visible. When `0`, no max-height is applied.                                                                             |
| `Theme`         | `Text`            | Space-separated theme tokens, reflected as `data-theme`. `header-align-top` top-aligns the header. Empty removes the attribute. Updated on `parametersChanged`.    |

<hr>

###### Placeholders

| Name                 | Description                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Header`             | Clickable title row. Stays visible when the card is closed.                                                     |
| `HeaderContent`      | Main header content. Grows to fill the space before the action placeholders.                                    |
| `ActionsWhenClosed`  | End-aligned header actions shown while an expandable card is closed.                                            |
| `ActionsWhenOpen`    | End-aligned header actions shown while the body is visible.                                                     |
| `Content`            | Card body. Hidden while an expandable card is closed. The only region that scrolls when height is constrained.  |
| `FooterLeft`         | Footer content aligned to the left. Sizes to its content.                                                       |
| `FooterCenter`       | Footer content aligned to the center. Sizes to its content.                                                     |
| `FooterRight`        | Footer content aligned to the right. Sizes to its content.                                                      |

<hr>

###### Events

| Name             | Description                                                                                          | Arguments                |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------ |
| `ToggleOpen`     | Fired when the header is clicked and the card toggles. Not fired when `IsOpen` is set from outside. | `IsOpen` (`Boolean`)     |
| `ToggleFavorite` | Fired when the favorite icon is clicked. Not fired when `IsFavorite` is set from outside.           | `IsFavorite` (`Boolean`) |
| `ToggleSelect`   | Fired when the selectable icon is clicked. Not fired when `IsSelected` is set from outside.         | `IsSelected` (`Boolean`) |
