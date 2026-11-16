###### Overview

A bus that sends a named event, with a list of key/value pairs, between screens and blocks. The event is delivered in this window and in every other window, tab and same-origin iframe that has the app open.

Send an event with the client action `EventEmitter`. To receive it, place an `EventBusListener` block on the screen or block that needs it and handle its `Received` event.

- Several listeners can use the same `Type`. Each one raises its own `Received`.
- A listener with `Type` set to `*` receives every event.
- The window that sends the event receives it too.
- An event sent while nobody is listening is lost. The bus does not keep past events.
- `Type` on `EventBusListener` is read when the block is ready. Changing it later does not switch the listener.
- Removing the block stops that listener only. Other listeners keep receiving events.

<hr>

###### Client action `EventEmitter`

Sends an event of `Type` with `Data` to this window and to every other window, tab and same-origin iframe. Returns nothing.

**Input parameters**

| Name   | Type            | Description                                                                                               |
| ------ | --------------- | --------------------------------------------------------------------------------------------------------- |
| `Type` | `Text`          | Name of the event. Optional. Listeners with the same `Type`, and listeners with `Type` `*`, receive it. |
| `Data` | `KeyValue List` | Payload. Each item has a `Key` and a `Value`, both `Text`. Mandatory.                                     |

<hr>

###### Block `EventBusListener`

Has no visual output. It registers when the block is ready and unregisters when the block is destroyed.

**Input parameters**

| Name   | Type   | Description                                                                                                                         |
| ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Type` | `Text` | Name of the event to listen to. Use `*` to receive every event. Empty listens only for events sent with an empty `Type`. Optional. |

**Events**

| Name       | Parameters               | Description                                                                     |
| ---------- | ------------------------ | ------------------------------------------------------------------------------- |
| `Received` | `Data` (`KeyValue List`) | Raised when a matching event arrives. `Data` is the list passed to `EventEmitter`. |

<hr>

###### Notes

- Sharing covers windows, tabs and iframes of the same origin that have loaded the bus. Other browsers, profiles and devices are not connected.
- Do not send an event whose `Type` is `*`. That name is the wildcard for listeners, and an event named `*` is delivered to those listeners twice.
- Only the text in `Key` and `Value` is sent. The list is serialized to JSON and deserialized on each listener.
- On a Traditional page, the screen reloads on every postback. The block registers again after each load. Events sent while the page is reloading are lost.
