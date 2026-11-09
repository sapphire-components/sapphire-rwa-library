###### Overview

The client action `SetApplicationLocale` changes the application locale in two steps.

1. It calls the system client action `SetCurrentLocale`. That action writes `$OS_Users$CurrentLocale` on the platform, including `localeCode` and `isRTL`.
2. It then runs this script. The script reads `$OS_Users$CurrentLocale` and applies it to the JavaScript library and the document: it copies `localeCode` and `isRTL` onto `SapphireRWALibrary.State`, then sets `document.documentElement.dir` to `rtl` or `ltr`.

The library also runs this script once during startup, so the library and the document match the locale the platform has already stored.

<hr>

###### Method

| Name                   | Returns | Description                                                                                                     |
| ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `SetApplicationLocale` | —       | Reads `$OS_Users$CurrentLocale` and applies `localeCode` and `isRTL` to the library and the document direction. |
