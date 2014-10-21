loop-grid
===

Make grid based controllers that trigger events and record loops using [soundbank](https://github.com/mmckegg/soundbank) and [loop-recorder](https://github.com/mmckegg/loop-recorder). Add a bunch of [soundbank-chunk](https://github.com/mmckegg/soundbank-chunk) instances to the grid and position/shape accordingly.

Implements [observ](https://github.com/raynos/observ) for easy data-binding to your views.

For an example of mapping to a midi controller, see [loop-launchpad](https://github.com/mmckegg/loop-launchpad).

## Install via [npm](https://npmjs.org/package/loop-grid)

```bash
$ npm install loop-grid
```

## API

```js
var LoopGrid = require('loop-grid')
```

### `LoopGrid(opts, additionalProps)`

```js
var loopGrid = LoopGrid({

  player: player, // instance of ditty
  recorder: recorder, // instance of loop-recorder

  scheduler: scheduler, // instance of bopper
  triggerOutput: scheduler, // stream of trigger events (e.g. soundbank-trigger)

  shape: [8, 8], // width, height

  // 
  chunkLookup: Observ({
    chunkId: {
      grid: ArrayGrid([]), // grid mapped IDs
      flags: {}
    }
  })

}, additionalProps)
```

Returns an extended instance of [ObservStruct](https://github.com/raynos/observ-struct).

### `loopGrid.store([length, start])`

`length` defaults to `loopGrid.loopLength()`.

`start` defaults to `scheduler.getCurrentPosition() - length`.

This calls `recorder.getLoop` for every ID currently mapped to this grid and then calls `player.set` for each result. It also creates an `undo()` point.

### `loopGrid.transform(func[, args...])`

Add a transform function to the loop. `func(input, args...)` is just an ordinary javascript function that receives an instance of [array-grid](https://github.com/mmckegg/array-grid) and must return a modified array-grid in return. The grid contains each loop coordinate mapped.

Returns a function that when called, removes the transform. Transforms can be stacked then ones from the middle of the pile, removed, using this method.

```js
var remove = loopGrid.transform(function(input){
  var kickLoop = input.get(0,0)
  input.set(0,1, kickLoop) // override the snare loop with the kick loop
  return input
})
```

### `loopGrid.flatten()`

Flatten the current `transform()` stack and create an undo point.

### `loopGrid.undo()`

### `loopGrid.redo()`

### `loopGrid.destroy()`

Clean up any listeners to `recorder` and `player`.

## Attributes

### `loopGrid` (ObservStruct)

Dehydrate (persist):

```js
fs.write('grid.json', JSON.stringify(loopGrid()))
```

Re-hydrate (restore):

```js
var data = JSON.parse(fs.readFileSync('grid.json', 'utf8'))
loopGrid.set(data)
```

### `loopGrid.transforms` (ObservArray)

Updatable / bindable list of active transforms.

### `loopGrid.chunkPositions` (ObservVarhash)

Map chunks (from opts.chunkLookup) to grid positions at specified origin.

### `loopGrid.loopLength` (Observ)

```js
loopGrid.chunkPositions.put('drums', [0,0])
```

## Computed Observables (read-only)

### `loopGrid.grid` (Observ(ArrayGrid))

An instance of array-grid that maps coordinates to the sound IDs of all chunks. Attemps to batch up changes to `nextTick`. If you need to access the grid in the same tick, call `loopGrid.forceRefresh` first.

### `loopGrid.active` (Observ(ArrayGrid))

Observable ArrayGrid containing true values where coords in current loop

### `loopGrid.playing` (Observ(ArrayGrid))

Observable ArrayGrid containing true values where coords is currently being triggered.

### `loopGrid.recording` (Observ(ArrayGrid))

Observable ArrayGrid containing true values where coords has played within range of `loopLength`.

### `loopGrid.loopPosition` (Observ)

### `loopGrid.triggerIds` (Observ)

Get a list of the public IDs of sounds mapped to this grid.

### `loopGrid.gridState` (Observ)

Example output:

```js
{
  grid: ArrayGrid([
    { id: 'drums#0', 
      isRecording: true, 
      isPlaying: false, 
      isActive: false 
    },
    { id: 'drums#0', 
      isRecording: true, 
      isPlaying: false, 
      isActive: false 
    }
  ], [8,8]),
  chunks: [
    {
      id: 'drums', 
      origin: [0,0], 
      shape: [1,4], 
      node: {..},
      color: [255, 100, 123]
    }
  ]
}
```