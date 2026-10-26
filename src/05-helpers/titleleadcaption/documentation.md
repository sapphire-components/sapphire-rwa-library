###### Overview

A text block with a title, a lead, and a caption. Each placeholder keeps its own style and its own line limit.

- **Title** is bold.
- **Caption** uses the disabled text color.
- `TitleClamp`, `LeadClamp`, and `CaptionClamp` apply only to their own placeholder. A value above `0` limits that placeholder to that many lines and ends the overflow with an ellipsis. `0` shows the full text. The three clamps are independent.
- A clamp change is applied on `parametersChanged`.

<hr>

###### Input parameters

| Name           | Type      | Description                                                                                                                          |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `CaptionClamp` | `Integer` | Maximum lines for **Caption**. Above `0`, extra lines are hidden and the last visible line ends with an ellipsis. `0` shows the full text. |
| `LeadClamp`    | `Integer` | Maximum lines for **Lead**. Above `0`, extra lines are hidden and the last visible line ends with an ellipsis. `0` shows the full text.       |
| `TitleClamp`   | `Integer` | Maximum lines for **Title**. Above `0`, extra lines are hidden and the last visible line ends with an ellipsis. `0` shows the full text.     |

<hr>

###### Placeholders

| Name      | Description                                                         |
| --------- | ------------------------------------------------------------------- |
| `Title`   | Primary text. Rendered in bold.                                     |
| `Lead`    | Secondary text between the title and the caption.                  |
| `Caption` | Supporting text under the lead. Rendered in the disabled text color. |
