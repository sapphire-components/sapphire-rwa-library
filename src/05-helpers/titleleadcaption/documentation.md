###### Overview

A text block with a title, a lead, and a caption. Each placeholder keeps its own style and its own line limit.

- **Title** is bold.
- **Caption** uses the disabled text color.
- `TitleClamp`, `LeadClamp`, and `CaptionClamp` apply only to their own placeholder. A value above `0` limits that placeholder to that many lines and ends the overflow with an ellipsis. `0` shows the full text. The three clamps are independent.
- `MarginBottom` adds `margin-bottom-<id>` on the root. `M` adds `margin-bottom-m`. Supported steps: `none`, `xs2`, `xs`, `s`, `m`, `l`, `xl`, `xl2`, `xl3`, `xl4`. Other `SapphireSize` values and an empty value add no class.
- A clamp or margin change is applied on `parametersChanged`.

<hr>

###### Input parameters

| Name           | Type           | Description                                                                                                                                                                |
| -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CaptionClamp` | `Integer`      | Maximum lines for **Caption**. Above `0`, extra lines are hidden and the last visible line ends with an ellipsis. `0` shows the full text.                                 |
| `LeadClamp`    | `Integer`      | Maximum lines for **Lead**. Above `0`, extra lines are hidden and the last visible line ends with an ellipsis. `0` shows the full text.                                    |
| `MarginBottom` | `SapphireSize` | Space below the block. Adds `margin-bottom-<id>` on the root (`none`, `xs2`, `xs`, `s`, `m`, `l`, `xl`, `xl2`, `xl3`, `xl4`). Other sizes and an empty value add no class. |
| `TitleClamp`   | `Integer`      | Maximum lines for **Title**. Above `0`, extra lines are hidden and the last visible line ends with an ellipsis. `0` shows the full text.                                   |

<hr>

###### Placeholders

| Name      | Description                                                          |
| --------- | -------------------------------------------------------------------- |
| `Title`   | Primary text. Rendered in bold.                                      |
| `Lead`    | Secondary text between the title and the caption.                    |
| `Caption` | Supporting text under the lead. Rendered in the disabled text color. |
