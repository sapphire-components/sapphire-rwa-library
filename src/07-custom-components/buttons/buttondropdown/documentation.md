###### Overview

A button that reveals a dropdown panel of actions. It supports two modes: a regular button whose label toggles the panel, and a split button where the label runs its own `Click` action while a dedicated chevron opens the panel.

- In regular mode the label is the trigger: activating it (click or `Enter`/`Space`, `ArrowDown` to open) toggles the panel.
- In split-button mode a chevron is appended after the label and becomes the trigger; the label instead fires the `Click` event. Tab reaches the label and the chevron separately.
- Keyboard focus (`:focus-visible`) uses the same inset stroke as `.btn`, on whichever of those controls is focused.
- The panel closes when a menu action (link or button) is activated, on `Escape` (from the trigger or from inside the panel), or on click outside. Form controls inside the panel do not close it.
- Closing with `Escape` or by activating a menu action with the keyboard returns focus to the trigger.

<hr>

###### Input parameters

| Name                | Type            | Description                                                                                     |
| ------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `ButtonClass`       | `Text`        | Allows to style the button to the existing semantic versions.                                   |
| `Enabled`           | `Boolean`       | Enables or disables all interaction, pointer and keyboard. Disabled dropdowns close any open panel and leave the tab order. |
| `IsSplitButton`     | `Boolean`       | When `True`, renders a separate chevron trigger and the label fires `Click` instead of opening. |
| `IsValid`           | `Boolean`       | When `False`, marks the component invalid and shows `ValidationMessage` below it.               |
| `Placement`         | `Text`        | Preferred placement of the actions panel relative to the trigger. Defaults to `bottom-start`.   |
| `Size`              | `SapphireSize`  | Height, type, padding and icon preset for the label and chevron. Supported: `xs` (28px, 12px type), `s` (32px, 13px type), `m` / `base` (36px, 14px type, default), `l` (44px, 14px type). The actions panel text uses the same type size; its rows keep their padding, so their height follows the type, not the button height. Other values fall back to `m`. |
| `ValidationMessage` | `Text`        | Message shown below the widget while `IsValid` is `False`.                                      |
| `Width`             | `SapphireScale` | Sets the width of the component.                                                                |

<hr>

###### Placeholders

| Name      | Description                                            |
| --------- | ------------------------------------------------------ |
| `Label`   | Element that acts as the button label / trigger.       |
| `Actions` | Content of the dropdown panel (menu links or buttons). |

<hr>

###### Events

| Name    | Description                                                                        |
| ------- | ---------------------------------------------------------------------------------- |
| `Click` | Fired when the label is activated in split-button mode (click or `Enter`/`Space`). |
