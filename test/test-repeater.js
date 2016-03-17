var test = require('tape')
var Repeater = require('../transforms/repeater')
var ObservGrid = require('observ-grid')
var ArrayGrid = require('array-grid')

test(function (t) {
  var transformedInput = null
  function transform (func, arg1, arg2) {
    var input = fakePlaybackGrid()
    transformedInput = func(input, arg1, arg2)
    t.equal(input, transformedInput)
  }

  var repeater = Repeater(transform)
  var grid = ObservGrid([], [2, 2])

  repeater.start(grid, 1)
  t.deepEqual(transformedInput, null)

  grid.set(0, 0, true)
  t.deepEqual(transformedInput.data, [{events: [[0, true], [0.5, false]], length: 1}])

  grid.set(0, 1, true)
  t.deepEqual(transformedInput.data, [
    {events: [[0, true], [0.5, false]], length: 1},
    {events: [[0, true], [0.5, false]], length: 1}
  ])

  repeater.setLength(2)
  t.deepEqual(transformedInput.data, [
    {events: [[0, true], [1, false]], length: 2},
    {events: [[0, true], [1, false]], length: 2}
  ])

  grid.set(0, 0, null)

  t.deepEqual(transformedInput.data, [
    , {events: [[0, true], [1, false]], length: 2}
  ])

  t.end()

})

function fakePlaybackGrid () {
  return ArrayGrid([], [2, 2])
}
