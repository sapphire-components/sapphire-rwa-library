###### Overview

A one-line log of who did what, when, and where. The widget root (`.whowhewherelog`) is filled with a single sentence. There are no events or placeholders.

The sentence is built in this order. A part that is empty is left out, together with its connecting word:

`{Action} on {Date} at {Time} by {Who} from {Specialty} in {Location} on behalf of {OnBehalfOf}`

- `Action` and the connecting words are translated for `Locale`. `Who`, `Specialty`, `Location`, and `OnBehalfOf` are copied in as provided.
- `Action` is a catalog key: `Added`, `Attended`, `Cancelled`, `Diagnosed`, `Discontinued`, `Executed`, `Issued`, `LastUpdated` (shown as `Last Updated`), `Prescribed`, `Recorded`, `Registered`, `Requested`, `Scheduled`. An unknown key is shown as typed.
- `Date` is written as `YYYY-MM-DD` from the UTC calendar date. An empty or invalid date is omitted.
- `Time` accepts `HH`, `HH:mm`, or `HH:mm:ss` and is shown as `HH:mm`. When `Hour12` is `True`, it is shown as `h:mm AM` or `h:mm PM` (for example `9:30 AM`). Seconds are dropped. A value that cannot be read is shown unchanged, still after the translated "at".
- `Locale` is a BCP 47 code (`en-US`, `pt-PT`, `fr-FR`, `fi-FI`, `vi-VN`, `ar-KW`). Empty uses `SapphireRWALibrary.State.locale`, then `en-US`. A language code without a region uses that language's catalog (`en` → `en-US`, `pt` → `pt-PT`).

For `en-US`, a full sentence reads: `Prescribed on 2026-03-14 at 09:30 by Dr. Silva from Cardiology in Ward 3 on behalf of Dr. Costa`.

<hr>

###### Input parameters

| Name         | Type      | Description                                                                                                                                                       |
| ------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Action`     | `Text`    | Catalog key for the verb that opens the sentence. Translated for `Locale`. Empty omits the verb.                                                                  |
| `Date`       | `Date`    | Date shown after the translated "on". Rendered as `YYYY-MM-DD` using the UTC calendar date. Empty or invalid omits the date and the word.                         |
| `Hour12`     | `Boolean` | When `True`, `Time` uses a 12-hour clock with `AM` / `PM`. When `False`, `Time` is `HH:mm`.                                                                       |
| `Locale`     | `Text`    | BCP 47 locale for `Action` and the connecting words (for example `en-US`, `pt-PT`). Empty falls back to `SapphireRWALibrary.State.locale`, then `en-US`.          |
| `Location`   | `Text`    | Place shown after the translated "in". Empty omits it.                                                                                                            |
| `OnBehalfOf` | `Text`    | Person shown after the translated "on behalf of". Empty omits it.                                                                                                 |
| `Specialty`  | `Text`    | Specialty shown after the translated "from". Empty omits it.                                                                                                      |
| `Time`       | `Text`    | Time shown after the translated "at". Accepts `HH`, `HH:mm`, or `HH:mm:ss`. Display is `HH:mm`, or `h:mm AM` / `h:mm PM` when `Hour12` is `True`. Empty omits it. |
| `Who`        | `Text`    | Person shown after the translated "by". Empty omits it.                                                                                                           |
