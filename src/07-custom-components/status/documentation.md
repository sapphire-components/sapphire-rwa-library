###### Overview

An inline status indicator that shows a semantic icon and label. `Type` is an `Alert` value; the matching icon and `SapphireColor` are shared with Toast and other feedback components.

- The component generates the icon and label into the `.status` root; there is no content placeholder.
- `Type` accepts `alert-info`, `alert-warning`, `alert-success`, or `alert-error`. Unknown values fall back to `alert-info`.
- Icon and text inherit the `SapphireColor` for that type (`info`, `warning`, `success`, `error`).

<hr>

###### Input parameters

| Property | Type           | Description                                                                      |
| -------- | -------------- | -------------------------------------------------------------------------------- |
| `Label`  | `Text`         | Text shown next to the icon.                                                     |
| `Size`   | `SapphireSize` | Icon size preset. Defaults to `m` (24px). `s` uses a 16px icon and a 12px label. |
| `Type`   | `Alert`        | Semantic variant. Icons and colours follow the shared `Alert` / `SapphireColor` list. |
