###### Overview

Restyles the OutSystems **Button** widget. Keep the platform `btn` class and add modifiers in **Style Classes**. Combine at most one appearance, one size, and one shape.

- With `btn` only, the control is the secondary / neutral button: 36px min-height, 14px type, 4px corners, an inset border (`--color-border`), and a `--color-neutral-1` hover fill.
- Icons (`.svg-icon`) inherit the button colour and scale with the size class (20px at the default size).
- Consecutive buttons (`.btn + .btn`) pick up an inline-start gap from the theme.
- The platform loading spinner (`span.btn-animation`) is hidden.

<hr>

###### Additional CSS classes

Add these on the Button **Style Classes** property together with `btn`. Omit appearance, size, or shape to keep the defaults above.

| Name                        | Description                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `btn-primary`               | Filled primary. White label and icon. Hover uses `--color-primary-dark`.                                         |
| `btn-tertiary`              | Ghost: no fill and no border. Hover tints with 10% of the current text colour.                                   |
| `btn-transparent`           | Ghost with a `currentColor` border. Inherits text colour. Hover tints with 10% of the current colour.            |
| `btn-destructive`           | Filled danger. White label and icon. Hover uses `--color-red-dark`.                                              |
| `btn-destructive-secondary` | Outlined danger: white fill, red border and text. Hover uses `--color-red-lightest`.                             |
| `btn-icon`                  | Icon-only padding (`8px`; `4px` with `btn-xsmall`). With `btn-large`, the control is a 48×48px square.           |
| `btn-xsmall`                | 24px min-height, 12px type, 12px icons, 8px inline padding.                                                      |
| `btn-small`                 | 32px min-height, 12px type, 16px icons, 16px inline padding.                                                      |
| `btn-large`                 | 48px min-height, 16px type, 24px icons, 24px inline padding.                                                      |
| `btn-sharp`                 | Square corners (`border-radius: 0`).                                                                             |
| `btn-rounded`               | Pill corners (`border-radius: 100px`).                                                                           |
