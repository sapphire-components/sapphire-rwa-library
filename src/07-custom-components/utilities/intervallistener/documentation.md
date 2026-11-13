###### Overview

A block with no visual output that receives the ticks of intervals started with the `IntervalStart` client action and raises an `OnTick` event.

- Set `IntervalId` to listen to one interval. Leave it empty to receive the ticks of every interval, and use the `IntervalId` parameter of `OnTick` to tell them apart.
- Several listeners can listen to the same interval. Each one raises its own `OnTick`.
- While the `OnTick` handler is still running (for example waiting for a server action), further ticks for that listener are skipped. Ticks do not pile up.
- Bind `Enabled` to a variable to turn listening on and off at runtime without removing the block.
- Removing the block from the page only stops listening. The interval keeps running until `IntervalClear` is called.

<hr>

###### Input parameters

| Name         | Type      | Description                                                                                                            |
| ------------ | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `IntervalId` | `Text`    | Interval to listen to. Empty listens to every interval. Can be bound to a variable to switch interval at runtime.      |
| `Enabled`    | `Boolean` | Optional, defaults to `True`. When `False`, ticks are ignored and `OnTick` is not raised. The interval keeps running.  |

<hr>

###### Events

| Name     | Parameters                                 | Description                                                                                                 |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `OnTick` | `IntervalId` (`Text`), `Count` (`Integer`) | Raised on every tick of the interval. `Count` is the number of ticks since `IntervalStart`, and `IntervalPause` / `IntervalResume` do not reset it. |
