###### Overview

A compact HSV color picker. The host shows a swatch of the committed color; activating it opens a Tippy overlay with a saturation/brightness plane, a hue slider, an optional hex field, and Cancel / Apply actions.

- The overlay is a draft: dragging the plane or slider, or typing a hex value, updates the preview only. Nothing is emitted until **Apply**.
- The preview swatch is split: **left** is the current committed color, **right** is the color being selected. Empty sides show a checkerboard.
- **Cancel**, `Escape`, clicking the trigger again, or clicking outside discards the draft and closes the overlay. `Change` is not fired.
- **Apply** normalizes the color to `#rrggbb` (lowercase), fires `Change`, and closes the overlay.
- `Value` seeds the committed color on init and via `parametersChanged`. `#rgb` and `#rrggbb` (with or without `#`) are accepted; malformed values are treated as empty.
- When `ShowInput` is `True`, the hex field is editable. Typing is normalized to lowercase `#` + hex digits; a complete value is always `#rrggbb` (3-digit `#rgb` expands on paste, blur, or Apply). `Enter` in the field is the same as Apply.
- When `AllowEmpty` is `False`, an empty (or malformed) hex cannot be applied and the input is marked invalid. When `True`, a **Clear** button sits between Cancel and Apply: it commits an empty value, fires `Change`, and closes the overlay. Apply may also emit an empty string.
- Without the hex field (`ShowInput` = `False`), Apply always emits the color from the HSV plane.

<hr>

###### Input parameters

| Name         | Type      | Description                                                                                                                                                         |
| ------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AllowEmpty` | `Boolean` | When `False`, Apply cannot emit an empty value, the hex input is styled invalid while empty or malformed, and Clear is hidden. When `True`, Clear commits an empty value (fires `Change` and closes). Apply may also emit an empty string. |
| `Enabled`    | `Boolean` | Enables or disables interaction. Disabled pickers ignore clicks and close any open overlay without emitting.                                                        |
| `ShowInput`  | `Boolean` | When `True`, shows an editable hex field in the overlay. When `False`, color can only be chosen from the HSV plane.                                                 |
| `Value`      | `Text`    | Committed hexadecimal color (`#rrggbb` or `#rgb`). Empty means no color. Updates while the overlay is closed refresh the trigger; an open draft is not overwritten. |

<hr>

###### Events

| Name     | Description                                                                                     | Arguments                               |
| -------- | ----------------------------------------------------------------------------------------------- | --------------------------------------- |
| `Change` | Fired when Apply is pressed with a valid color, or when Clear commits an empty value (`AllowEmpty` is `True`). | `Identifier` (`Text`), `Value` (`Text`) |
