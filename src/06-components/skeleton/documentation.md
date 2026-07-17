###### Overview

A loading placeholder that shows animated skeleton shapes while data is being fetched, then reveals the real `Content` once loading completes. It can render any combination of a pulsing circle, a spinner, and a stack of bars, configured through the `Display` structure.

While `IsWaiting` is `True` the placeholders pulse. When `IsWaiting` becomes `False`, each placeholder plays a staggered "destruction" animation and is removed; after the last one resolves, the `Content` placeholder is shown in its place. Placeholders render in a fixed order: circle, then spinner, then bars.

<hr>

###### Input parameters

| Property    | Type            | Description                                                                                  |
| ----------- | --------------- | -------------------------------------------------------------------------------------------- |
| `Display`   | `Structure`     | Controls which loading placeholders are rendered. See the `Display` structure below.         |
| `Enabled`   | `Boolean`       | Enables or disables the component.                                                           |
| `IsWaiting` | `Boolean`       | While `true`, placeholders are shown. Setting it to `false` animates them out and reveals `Content`. |
| `Width`     | `SapphireScale` | Sets the width of the skeleton container.                                                    |

<hr>

###### `Display` structure

An object describing which placeholders to render. Rendered in order: circle, loading, then bars.

| Property  | Type      | Description                                                                                             |
| --------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `Bars`    | `Integer` | Number of bar placeholders to render. When `> 0`, renders that many bars with decreasing widths.        |
| `Circle`  | `Text`  | Size of a circular placeholder. Accepts `s`, `m`, or `l`; any other value (or empty) renders no circle. |
| `Loading` | `Boolean` | When `true`, renders a spinner loader.                                                                  |

<hr>

###### Placeholders

| Name      | Description                                                       |
| --------- | ----------------------------------------------------------------- |
| `Content` | Element to be displayed as content after IsWaiting becomes false. |
