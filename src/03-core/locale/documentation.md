###### Overview

Fixed strings the library shows in the UI, translated per locale. Widgets call `SapphireRWALibrary.Locale.translate` instead of writing the text themselves.

`DateTimePicker` uses it for `Apply`, `Clear`, `ChooseDate`, and the previous and next month, year, and years labels. `WhoWhenWhereLog` uses it for the action and the connecting words (`on`, `at`, `by`, `from`, `in`, `onBehalfOf`).

- The key list is defined by `messages/en-US.ts`. Every other catalog provides the same keys.
- A missing translation uses the English string. A key that English does not have is returned unchanged.
- Document direction (`ltr` / `rtl`) is applied by `SetApplicationLocale`. This catalog only returns text.

`SapphireRWALibrary.Locale.translate('ChooseDate', 'pt-PT')` returns `Escolher data`. `SapphireRWALibrary.Locale.translate('ChooseDate', 'en')` returns `Choose date`.

<hr>

###### Method

| Name        | Returns | Description                                                                                          |
| ----------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `translate` | `Text`  | Returns the string for `key` in the resolved locale. Call it as `SapphireRWALibrary.Locale.translate`. |

<hr>

###### Input parameters

| Name     | Type   | Description                                                                                                                          |
| -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `key`    | `Text` | Catalog key. See **Message keys**. A key that is missing from English is returned as typed.                                         |
| `locale` | `Text` | Optional BCP 47 code (for example `en-US`, `pt-PT`). Empty uses `SapphireRWALibrary.State.locale`, then `en-US`.                     |

<hr>

###### Locale resolution

The locale is chosen in this order. The first value that matches a catalog is used.

1. The `locale` argument.
2. `SapphireRWALibrary.State.locale`, written by `SetApplicationLocale` from the platform locale.
3. `en-US`.

Matching is trimmed and case-insensitive (`EN-us` is `en-US`).

- A code that names a catalog is used as-is (`pt-PT`, `ar-KW`).
- A language without a region uses that language's catalog: `en` → `en-US`, `pt` → `pt-PT`. `fr`, `fi`, `vi`, and `ar` each have one catalog, so the bare code uses it.
- A region that has no catalog (`en-GB`, `pt-BR`) does not match. Resolution continues with the application locale, then `en-US`. It does not switch to another region of the same language.

<hr>

###### Catalogs

| Code    | File                 | Bare language              |
| ------- | -------------------- | -------------------------- |
| `en-US` | `messages/en-US.ts`  | `en`. Also the fallback.   |
| `pt-PT` | `messages/pt-PT.ts`  | `pt`                       |
| `fr-FR` | `messages/fr-FR.ts`  | `fr`                       |
| `fi-FI` | `messages/fi-FI.ts`  | `fi`                       |
| `vi-VN` | `messages/vi-VN.ts`  | `vi`                       |
| `ar-KW` | `messages/ar-KW.ts`  | `ar`                       |

<hr>

###### Message keys

English is the source text. The other catalogs translate the same keys.

**Actions.** Opening verb of `WhoWhenWhereLog`.

| Key            | English        |
| -------------- | -------------- |
| `Added`        | Added          |
| `Attended`     | Attended       |
| `Cancelled`    | Cancelled      |
| `Diagnosed`    | Diagnosed      |
| `Discontinued` | Discontinued   |
| `Executed`     | Executed       |
| `Issued`       | Issued         |
| `LastUpdated`  | Last Updated   |
| `Prescribed`   | Prescribed     |
| `Recorded`     | Recorded       |
| `Registered`   | Registered     |
| `Requested`    | Requested      |
| `Scheduled`    | Scheduled      |

**Date picker.** Labels and accessible names on `DateTimePicker`.

| Key             | English          |
| --------------- | ---------------- |
| `Apply`         | Apply            |
| `ChooseDate`    | Choose date      |
| `Clear`         | Clear            |
| `NextMonth`     | Next month       |
| `NextYear`      | Next year        |
| `NextYears`     | Next years       |
| `PreviousMonth` | Previous month   |
| `PreviousYear`  | Previous year    |
| `PreviousYears` | Previous years   |

**Connecting words.** Used by `WhoWhenWhereLog`.

| Key          | English       |
| ------------ | ------------- |
| `at`         | at            |
| `by`         | by            |
| `from`       | from          |
| `in`         | in            |
| `on`         | on            |
| `onBehalfOf` | on behalf of  |

<hr>

###### Notes

- To add a key, add it to `messages/en-US.ts`, then to every other file in `messages/`. Each file must list every key.
- To add a locale, add `messages/<language>-<REGION>.ts` (for example `messages/pt-BR.ts`) with every key. The file name, without `.ts`, is the catalog code.
- `en` and `pt` are pinned to `en-US` and `pt-PT`. A language with a single catalog is used for its bare code on its own. When a language has more than one catalog, set the bare-code catalog in `REPRESENTATIVE` in `messages.ts`.
- `Locale` returns text only. It does not set `dir` on the document.
