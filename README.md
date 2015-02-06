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

### `loopGrid.triggerEvent(event)`

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
