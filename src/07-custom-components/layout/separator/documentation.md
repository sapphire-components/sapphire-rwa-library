###### Overview

A horizontal rule. Color, thickness, vertical margins, and width come from inputs; the block has no placeholder and no script.

- The line color is `--color-border`.
- `Thickness` is the line height in pixels. The default is `1`.
- `MarginTop` and `MarginBottom` use `SapphireSize` steps (`none`, `xs`, `s`, `base`, `m`, `l`, `xl`). Both default to `base` (16px).
- `Width` is a `SapphireScale` preset written to `data-widthcomponent`. The default is `full`.

<hr>

###### Input parameters

| Name            | Type            | Description                                                                                                |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `ExtendedClass` | `Text`          | Extra CSS classes added to the component root.                                                            |
| `Identifier`    | `Text`          | Optional identifier written to `data-identifier`.                                                          |
| `MarginBottom`  | `SapphireSize`  | Space below the line. Defaults to `base`.                                                                  |
| `MarginTop`     | `SapphireSize`  | Space above the line. Defaults to `base`.                                                                  |
| `Theme`         | `Text`          | Optional space-separated theme tokens written to `data-theme`.                                             |
| `Thickness`     | `Integer`       | Line height in pixels. Defaults to `1`.                                                                    |
| `Width`         | `SapphireScale` | Width preset (`auto`, `xs`–`xl7`, `full`, etc.) applied through `data-widthcomponent`. Defaults to `full`. |
