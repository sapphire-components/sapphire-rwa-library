###### Overview

A set of client actions that run something at a fixed cadence, such as polling, refreshing a list or a countdown. Each interval has a name and can be paused, resumed, retimed and cleared.

Start an interval with `IntervalStart`. To react to its ticks, place an `IntervalListener` block on the screen or block that needs them and handle its `OnTick` event.

- An interval is not tied to a screen or block. It keeps running when the user navigates to another screen, until `IntervalClear` or `IntervalClearAll` is called or the page is reloaded.
- Any number of intervals can run at the same time. Each one is identified by its `IntervalId`.
- The first tick fires after `Milliseconds`, not immediately.
- By default an interval belongs to the browser tab that started it. Set `SharedAcrossTabs` to `True` to share it with every open tab of the app (see **Sharing across tabs**).

<hr>

###### Client actions

| Name                      | Returns               | Description                                                                                                                                                          |
| ------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IntervalStart`           | `Text`                | Creates an interval and turns it on. Returns its `IntervalId`, or empty when `Milliseconds` is not greater than `0`.                                                |
| `IntervalPause`           | `Boolean`             | Turns the interval off. It stays registered and can be resumed. Returns `False` when the id is unknown.                                                             |
| `IntervalResume`          | `Boolean`             | Turns a paused interval back on. The next tick fires a full `Milliseconds` later. Has no effect on a running interval. Returns `False` when the id is unknown.       |
| `IntervalSetMilliseconds` | `Boolean`             | Changes the cadence and keeps the tick count. A running interval restarts its wait from now. A paused interval stays paused. Returns `False` when the id is unknown or `Milliseconds` is not greater than `0`. |
| `IntervalClear`           | `Boolean`             | Stops and removes the interval, in every tab when shared. Returns `False` when the id is unknown.                                                                   |
| `IntervalClearAll`        | —                     | Stops and removes every interval of this tab. Shared intervals are removed from every tab.                                                                          |
| `IntervalIsActive`        | `Boolean`              | `True` when the interval exists and is on (not paused). For a shared interval, the result is the same in every tab.                                                |

<hr>

###### Input parameters

| Name               | Type      | Used by                                     | Description                                                                                                                                                            |
| ------------------ | --------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IntervalId`       | `Text`    | All except `IntervalClearAll`               | Name of the interval. In `IntervalStart`, leave it empty to get a generated id (`interval-…`), returned by the action. Starting an id that already exists replaces it. |
| `Milliseconds`     | `Integer` | `IntervalStart`, `IntervalSetMilliseconds`  | Time between ticks, in milliseconds. Must be greater than `0`. Optional in `IntervalStart`, where it defaults to `1000` (1 second). Mandatory in `IntervalSetMilliseconds`. |
| `SharedAcrossTabs` | `Boolean` | `IntervalStart`                             | Optional, defaults to `False`. `False`: the interval exists only in this tab. `True`: it is shared with every open tab of the app.                                    |

<hr>

###### Sharing across tabs

Each browser tab, including one opened with Alt+Enter, loads the app separately, so by default each tab has its own intervals. With `SharedAcrossTabs = True`:

- Every open tab of the same app knows the interval, and its `IntervalListener` blocks receive every tick with the same `Count`.
- Only one tab, the leader, keeps time for the interval, so the work is not repeated once per tab. The tab that calls `IntervalStart` becomes the leader.
- `IntervalPause`, `IntervalResume`, `IntervalSetMilliseconds` and `IntervalClear` work from any tab and apply to all of them.
- When the leader tab is closed or reloaded, another open tab takes over and the count continues.
- A tab opened later joins the shared intervals that already exist, including paused ones.
- Sharing only covers tabs of the same app, in the same browser and browser profile. Other browsers, profiles and devices are not connected.
- In a browser that cannot share intervals, `IntervalStart` writes a warning to the browser console and the interval runs in the current tab only.

<hr>

###### Notes

- Removing an `IntervalListener` from the page (for example when leaving the screen) does not stop the interval. Call `IntervalClear` when it is no longer needed, or it keeps ticking in the background.
- Calling `IntervalStart` again with the same id restarts the interval with the new `Milliseconds` and resets the count to `0`. Use `IntervalSetMilliseconds` to change the cadence and keep the count.
- Use different ids for per-tab and shared intervals. A shared interval started in another tab replaces a per-tab interval with the same id. Starting a per-tab interval with the id of a shared one clears the shared interval in every tab.
- Browsers slow down timers in background tabs, so ticks can arrive late or less often while the tab is hidden. For a shared interval, every tab sees this slowdown while the leader tab is hidden.
