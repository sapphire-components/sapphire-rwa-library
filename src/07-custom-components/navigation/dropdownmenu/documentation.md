###### Overview

A collapsible menu section for side navigation. A clickable header (optional icon, `Label` placeholder, and chevron) toggles an `Items` panel that holds links or nested `DropdownMenu`s. The OutSystems block wrapper uses `display: contents`, so the menu sits directly in its parent layout.

- Clicking the header (`.dropdownmenu-header`) or pressing `Enter` on it toggles the menu. The header is focusable (`tabindex="0"`). Open state is reflected as `data-isopen` on the root, which shows `.dropdownmenu-items` and rotates the chevron.
- Open state is saved per instance in local storage (`sph-dropdownmenu-{runtimeId}`) and restored on init, so menus keep their state across page navigation. With no saved value the menu starts closed.
- Menus can be nested. The script sets `data-rootlevel` on init: `true` for a menu that is not inside another `.dropdownmenu`, `false` otherwise. Root menus get a bold 16px label, a left accent border on hover, and extra bottom spacing. Nested menus hide the icon, drop the border, and indent their items less.
- Links to the traditional (`.aspx`) version of the current screen are also marked active. Any link whose path ends in `{ScreenName}.aspx` (case-insensitive, query string and hash ignored) gets the `active` class. `ScreenName` comes from the optional `screenName` init value, or the last segment of the current URL when it is empty, so screen `EmergencyArticle_Screen` activates a link to `.../EmergencyArticle_Screen.aspx`. When several modules have a screen with that name, only links whose module (first path segment) matches the current one are marked, comparing case-insensitively and treating a Reactive `_RBO` suffix as `_BO` (`/Sapphire_RBO/Hospital_Show` activates `/Sapphire_BO/Hospital_Show.aspx`, not `/PharmaStocks_BO/Hospital_Show.aspx`). If no link on the page matches the module, every link with the screen name is marked as a fallback (`data-screen-fallback`). Since menus load their items at different times, fallback links are unmarked in every menu as soon as a link for the current module appears, and menus left without an active link return to their saved open state.
- Menu items are often loaded asynchronously, after the menu initializes. The active check runs on init and then through a `MutationObserver` on the menu, which disconnects once a non-fallback `a.active` link is found or on `destroy()`.
- If an `a.active` link is inside the menu, the menu is marked `data-isactive='true'` and forced open. A root menu with an active link also gets a primary accent border, icon, and bold label, and scrolls the active link into view (centered) when it is outside the visible area of `.layoutaside-body` (or the viewport).
- Links (`a`) inside `.dropdownmenu-items` are styled as 26px menu rows; `a.active` gets a light primary background and bold text.
- `DesignSystemMenu` uses `open()` / `close()` for its expand all, collapse all, and filter actions.

<hr>

###### Input parameters

| Name            | Type      | Description                                                                                                                                                   |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExtendedClass` | `Text`    | Extra CSS classes added to the `.dropdownmenu` root.                                                                                                          |
| `IconName`      | `Text`    | Leading icon in the header (`SapphireSize` `S`). Empty hides the icon. Hidden on nested menus.                                                                |
| `Identifier`    | `Text`    | Reflected as `data-identifier` on the root. The component emits no events.                                                                                    |
| `IsOpen`        | `Boolean` | Initial `data-isopen` value rendered on the root. The script then applies the saved local storage state (closed if none), and changes after init are ignored. |
| `ItemId`        | `Text`    | Reflected as `data-itemid` on the root. Not read by the script.                                                                                               |
| `ItemParentId`  | `Text`    | Reflected as `data-itemparentid` on the root. Not read by the script.                                                                                         |

<hr>

###### Placeholders

| Name    | Description                                                              |
| ------- | ------------------------------------------------------------------------ |
| `Items` | Menu content shown when open: links (`a`) and/or nested `DropdownMenu`s. |
| `Label` | Header text.                                                             |

<hr>

###### Client methods

| Name      | Description                                           |
| --------- | ----------------------------------------------------- |
| `open()`  | Opens the menu and saves the state to local storage.  |
| `close()` | Closes the menu and saves the state to local storage. |
| `markTraditionalLinksActive(screenName)` | Adds `active` to links in the menu whose path ends in `{screenName}.aspx`, preferring links in the current module. Called on init. |
