###### Overview

A phone field with a country dropdown and a number input. The closed dropdown shows the flag and dial code. Hovering it shows the localized country name in a title tooltip. The number input formats as the user types.

- Countries and dial codes come from `libphonenumber-js`. Names come from `Intl.DisplayNames`.
- Flag SVGs come from `sapphire-rwa-flags.js`. Include that script before constructing `PhoneInput`. A missing script omits flags and logs one warning.
- The overlay is a Tippy popover (`window.tippy`), same as `SapphireDropdown`. If Tippy is missing, the country list does not open and a warning is logged.
- `FavoriteCountries` stay at the top of the overlay, in the given order. The rest of the list is alphabetical for `Locale`. A divider separates the two groups.
- The overlay has a search field. It matches the localized name, the ISO code, and the dial code (prefix, with or without `+`).
- Typing a national number formats it for the selected country. Pasting or typing a number that starts with `+` (or the international prefix `00`) detects the country and, on blur, shows the national format.
- `OnChange` fires when the user changes the country or the number. Write `CountryCode`, `DialCode`, and `PhoneNumber` back from that event. `PhoneNumber` is the national digits, including a trunk prefix when the country uses one (for example `02079460958` for a London number). `IsValid` is `True` only when that number is valid for the country.
- `CountryCode` wins over `DialCode` when both are set. An international `PhoneNumber` (`+…` or `00…`) selects its own country. `UK` is treated as `GB`.
- When `CountryCode` is empty and `DialCode` matches several countries, the locale region is used, then the first favorite, then the main country for that dial code (`US` for `+1`, `GB` for `+44`).
- With no country and no dial code, the first favorite is used, then the locale region, then `US`.

<hr>

###### Input parameters

| Name                | Type      | Description                                                                                                                                                          |
| ------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CountryCode`       | `Text`    | ISO 3166-1 alpha-2 country code. `UK` maps to `GB`. Empty falls through to `DialCode`, then the default country.                                                     |
| `DialCode`          | `Integer` | Calling code without `+` (for example `351`). Used when `CountryCode` is empty.                                                                                      |
| `Enabled`           | `Boolean` | Enables or disables the dropdown and the number input.                                                                                                               |
| `FavoriteCountries` | `Text`    | Countries pinned to the top. Comma, space, or semicolon separated (`PT, US, GB`), or a JSON array (`["PT","US","GB"]`). Unknown codes are ignored.                   |
| `Locale`            | `Text`    | BCP 47 locale for country names and list order (for example `en-US`, `pt-PT`). Empty or invalid values fall back to `SapphireRWALibrary.State.locale`, then `en-US`. |
| `PhoneNumber`       | `Text`    | National digits for the selected country. An international value (`+351912345678` or `00351912345678`) selects the country and stores the national digits.           |

<hr>

###### Events

| Name     | Description                                            | Arguments                                                              |
| -------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `Change` | Fired when the user changes the country or the number. | `CountryCode` (`Text`), `DialCode` (`Integer`), `PhoneNumber` (`Text`), `IsValid` (`Boolean`) |

<hr>
