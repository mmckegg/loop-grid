loop-grid
===

Make grid based controllers that trigger events and record loops using [soundbank](https://github.com/mmckegg/soundbank) and [loop-recorder](https://github.com/mmckegg/loop-recorder). Add a bunch of [soundbank-chunk](https://github.com/mmckegg/soundbank-chunk) instances to the grid and position/shape accordingly.

Implements [observ](https://github.com/raynos/observ) for easy data-binding to your views.

For an example of mapping to a midi controller, see [loop-launchpad](https://github.com/mmckegg/loop-launchpad).

## Install via [npm](https://npmjs.org/packages/loop-grid)

```bash
$ npm install loop-grid
```

## API

```js
var LoopGrid = require('loop-grid')
```

### `LoopGrid(opts)`

```js
var loopGrid = LoopGrid({
  player: player, // instance of ditty
  recorder: recorder, // instance of loop-recorder
  shape: [8, 8] // width, height
})
```

### `loopGrid.add(chunk)`

Add an observable `chunk` such as [soundbank-chunk](https://github.com/mmckegg/soundbank-chunk). If the chunk changes, the mapping will update accordingly.

The chunk needs to confirm to the [observ pattern](https://github.com/raynos/observ) and expose the following attributes: `id`, `origin`, `grid`.

```js
var Chunk = require('soundbank-chunk')
var drums = Chunk({
  id: 'drums',
  shape: [4, 1], // 4 across, 1 down
  stride: [1, 4],
  origin: [0, 0], // put it in the top left corner
  slots: [ // the soundbank slots (IDs relative to this chunk)
    {id: 'kick', sources: [{node: 'sample', url: 'kick.wav'}], output: 'post'},
    {id: 'snare', sources: [{node: 'sample', url: 'snare.wav'}], output: 'post'},
    {id: 'hihat', sources: [{node: 'sample', url: 'hihat.wav'}], output: 'post'},
    {id: 'openhat', sources: [{node: 'sample', url: 'openhat.wav'}], output: 'post'},
    {id: 'post', processors: [{node: 'overdrive'}]}
  ],
  sounds: ['kick', 'snare', 'hihat', 'openhat'], // what to put on grid
  outputs: ['post'], // expose outputs to other chunks
})

loopGrid.add(drums)
```

### `loopGrid.remove(id)`

Specify the `id` of a previously added chunk to remove from this grid. This does not affect the chunk or current loop, just removes all mapping from the grid.

### `loopGrid.loopRange(start, length)`

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

### `loopGrid.getSoundIds()`

Get a list of the public IDs of sounds mapped to this grid.

### `loopGrid.destroy()`

Clean up any listeners to `recorder` and `player`.

## Observable Properties

### `loopGrid.grid` (Observ(ArrayGrid))

An instance of array-grid that maps coordinates to the sound IDs of all chunks. Notifies on any change to chunks.

### `loopGrid.chunkIds` (ObservArray)

### `loopGrid.active` (ObservArray)

List of sound IDs currently being triggered by player. Notifies on every change.

```js
loopGrid.active(function(ids){
  // called every time the active items change
  // use ids._diff to find out what changed for partial updates
})