###### Overview

A presentation-only widget that shows a country flag and/or localized country name from an ISO 3166-1 alpha-2 code (`PT`, `US`, `GB`, …). The widget root (`.country`) is filled by JavaScript; there are no events, placeholders, or actions.

- Empty `CountryCode`, or both `ShowFlag` and `ShowName` set to `False`, renders nothing.
- `UK` is treated as `GB`. Codes are trimmed and matched case-insensitively.
- Country names come from `Intl.DisplayNames` (`type: 'region'`). If the browser cannot resolve a name, the name is omitted even when `ShowName` is `True`.
- Flag SVGs live in a **separate script**, `sapphire-rwa-flags.js` (4×3 assets from [lipis/flag-icons](https://github.com/lipis/flag-icons), MIT). Include it on screens that use `ShowFlag`, **before** the `OnReady` that constructs `SapphireRWALibrary.Country`. The main library does not embed the flags.
- If the flags script is missing, the flag is omitted (the name still renders when `ShowName` is `True`) and a console warning is logged once. If the script is loaded but there is no SVG for the code, the flag is omitted with no extra warning.
- When both flag and name are shown, the flag is decorative (`alt=""`, `aria-hidden`). When only the flag is shown, `alt` is the localized name, or `Flag of {CODE}` if the name is unavailable.
- Layout is an inline row (8px gap). Default flag height is 24px (4:3). `Size` `s` is the only override. The OutSystems block wrapper uses `display: contents` so the row sits in the parent flow.

<hr>

###### Input parameters

| Property      | Type           | Description                                                                                                                                                 |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CountryCode` | `Text`         | ISO 3166-1 alpha-2 country code (trimmed, case-insensitive). `UK` maps to `GB`. Empty or unrecognized values render no flag and no name.                    |
| `Locale`      | `Text`         | BCP 47 locale for the country name (for example `en-US`, `pt-PT`). Empty or invalid values fall back to `SapphireRWALibrary.State.locale`, then to `en-US`. |
| `ShowFlag`    | `Boolean`      | When `True`, renders the flag image before the name. Omitted when the flags script is missing or the code has no SVG.                                       |
| `ShowName`    | `Boolean`      | When `True`, renders the localized country name. Omitted when `Intl.DisplayNames` cannot resolve the code.                                                  |
| `Size`        | `SapphireSize` | Visual preset. Default (and any value other than `s`) is a 24px-tall flag with 4px corners. `s` uses a 16px flag, 2px corners, and a 12px name.             |

<hr>
