loop-grid
===

An observable collection of looped event sequences shaped to a grid.

## Install via [npm](https://npmjs.org/package/loop-grid)

```js
$ npm install loop-grid
```

## API

```js
var LoopGrid = require('loop-grid')
```

### `var loopGrid = LoopGrid(options)`

Returns an [observable](https://github.com/raynos/observ) instance of LoopGrid.

#### options:
  - **scheduler**: (required) instance of [Bopper](https://github.com/mmckegg/bopper)
  - **triggerEvent**: (required) `function(event)` called for every event to be triggered
  - **audio**: (required) instance of [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)

### `loopGrid()`

Return the current object descriptor (state).

### `loopGrid.set(descriptor)`

Set the current object descriptor (state).

### `loopGrid.shape` (`Observ([rows, cols])`)

Included in state.

### `loopGrid.loops` (`Observ([ { length: 8, events: [] }, ... ])`)

Included in state.

### `loopGrid.targets` (`Observ([ids])`)

Mapping of grid loops to ids.

Included in state.

### `loopGrid.loopLength` (`Observ(8)`)

Included in state.

### `var removeListener = loopGrid.onEvent(listener)`

```js
var event = {
  id: String,
  event: 'start' | 'stop',
  position: Number, // beat
  time: Number, // based on
  args: Array
}
```

### `var value = loopGrid.loopPosition()`

### `var removeListener = loopGrid.loopPosition(listener)`

### `var arrayGrid = loopGrid.grid()`

Returns [ArrayGrid](https://github.com/mmckegg/array-grid) based on `loopGrid.targets` and `loopGrid.shape`.

### `var removeListener = loopGrid.grid(listener)

### `var grid = loopGrid.playing()`

Returns ArrayGrid of `true` values where target is currently being triggered.

### `var removeListener = loopGrid.playing(listener)`

### `var grid = loopGrid.active()`

Returns ArrayGrid of `true` values where target has a current loop.

### `var removeListener = loopGrid.active(listener)`

### `loopGrid.destroy()`

## Looper

```js
var Looper = require('loop-grid/looper')
```

### `var looper = Looper(loopGrid)`

### `var loops = looper()`

### `var removeListener = looper(listener)`

### `var currentlyRecording = looper.recording()`

### `var removeListener = looper.recording(listener)`

### `looper.store()`

### `looper.flaten()`

### `var releaseTransform = looper.transform(func(input, args..), args)`

Pass in a function to add to transform stack. `input` is an instance of [ArrayGrid](https://github.com/mmckegg/array-grid) and should return either the modified `input` or a new instance of `ArrayGrid`.

### `looper.undo()`

### `looper.redo()`

### `looper.isTransforming()`

## Computed Flags

```js
var computeFlags = require('loop-grid/compute-flags')
```

## Computed Targets

```js
var computeTargets = require('loop-grid/compute-targets')
```

## Selector

Range selector for [loop-grid](https://github.com/mmckegg/loop-grid).

## API

```js
var Selector = require('loop-grid/selector')
```

### `var selection = Selector(shape)`

Returns an extended instance of ObservGrid with `shape` specified.

### `selector.start(inputGrid, done)`

Pass in an observable ArrayGrid. `done` will be called on `stop` or before subsequent `start`.

Any truthy values will trigger a selection. Simultaneous true values will trigger range selection. `selection` will have `.set(selectedIndexes)` called on every change.

### `selector.clear()`

Sets `selection` to an empty array.

### `selector.stop()`

Release watch of `inputGrid` and call `done`.


# Transforms

## Holder

Beat stutter/looper

```js
var Holder = require('loop-grid/transforms/holder')
```

### `var holder = Holder(transform)`

Pass `loopGrid.transform` to this constructor.

### `holder.setLength(length)`

Choose the length (in beat decimal) of the stutter effect.

### `holder.start(position[, indexes, done])`

Loop events in specified `indexes` (or all if not specified) from `position` to `position + length`. Ensure each event length is no longer than specified `length` (truncating if necessary).

Automatically calls `holder.stop()` first if there is a current hold in progress.

### `holder.stop()`

Release `transform` and call `done` if specified.

## Mover

Move selected ranges of loops to new origin.

```js
var Mover = require('loop-grid/transforms/mover')
```

### `var mover = Mover(transform)`

Pass `loopGrid.transform` to this constructor.

### `mover.start(inputGrid, selectedIndexes, done)`

Finds the top-left most coordinates in `selectedIndexes`, and uses this as the start origin. Any true values in `inputGrid` will call `transform` with a function that moves the values from selectedIndexes to the new origin. Multiple true values will cause the selectedIndexes to be duplicated.

### `mover.stop()`

Release any pending `transform` and stop watching `inputGrid`.

## Repeater

```js
var Repeater = require('loop-grid/transforms/repeater')
```

### `var repeater = Repeater(transform)

Pass `loopGrid.transform` to this constructor.

### `repeater.start(inputGrid, length)`

Held notes will call `transform` with a function that creates a repeating note with length `length / 2` at the rate of specified `length`.

### `repeater.setLength(length)`

### `repeater.stop()`

Release the `inputGrid`.

## Suppressor

Suppress selected loops

```js
var Suppressor = require('loop-grid/transforms/suppressor')
```

### `var suppressor = Suppressor(transform, shape[, stride])`

Pass `loopGrid.transform` to this constructor.

Returns an extended [observ](https://github.com/raynos/observ) instance containing instances of [array-grid](https://github.com/mmckegg/array-grid) with `true` values at coords where currently suppressed.

### `suppressor.start(indexes, done)`

Calls `transform` with a function that suppresses all `indexes` specified.

### `suppressor.stop()`

Release suppression `transform`.
