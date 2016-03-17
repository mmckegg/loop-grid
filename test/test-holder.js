var test = require('tape')
var Holder = require('../transforms/holder')
var ArrayGrid = require('array-grid')

test(function (t) {
  var transformedInput = null
  var releaseCalled = 0
  function transform (func, arg1, arg2, arg3) {
    var input = fakePlaybackGrid()
    transformedInput = func(input, arg1, arg2, arg3)
    t.equal(input, transformedInput)
    return function () {
      releaseCalled += 1
    }
  }

  var holder = Holder(transform)

  holder.setLength(1)

  holder.start(0, [])

  t.deepEqual(transformedInput.data, [
    {events: [[0, true], [0.5, false]], length: 1}, {events: [ [ 0, true ], [0.5, false] ], length: 1}
  ])

  holder.start(2, [])
  t.equal(releaseCalled, 1)

  t.deepEqual(transformedInput.data, [
    {events: [[0, true], [0.5, false]], length: 1}, {events: [[0, true], [0.9, false]], length: 1}
  ])

  holder.setLength(2)
  t.equal(releaseCalled, 2)
  t.deepEqual(transformedInput.data, [
    {events: [[0, true], [0.5, false], [1, true], [1.4, false]], length: 2}, {events: [[0, true], [0.9, false], [1, true], [1.4, false], [1.5, true]], length: 2}
  ])

  holder.start(3, [])
  t.equal(releaseCalled, 3)
  t.deepEqual(transformedInput.data, [
    {events: [[0, true], [0.5, false], [1, true], [1.4, false]], length: 2}, {events: [[ 0.5, false ], [1, true], [1.4, false], [1.5, true]], length: 2}
  ])

  holder.setLength(1)
  holder.start(1, [0])
  t.deepEqual(transformedInput.data, [
    {events: [[0, true], [0.4, false]], length: 1}, {events: [ [0.5, false], [2, true], [2.9, false], [3, true], [3.4, false], [3.5, true] ], length: 4}
  ])

  holder.setLength(0.2)
  t.deepEqual(transformedInput.data, [
    {events: [[0, true], [ 0.1, null ]], length: 0.2}, {events: [[0.5, false], [2, true], [2.9, false], [3, true], [3.4, false], [3.5, true]], length: 4}
  ])

  t.end()
})

function fakePlaybackGrid () {
  return ArrayGrid([
    {events: [[0, true], [0.5, false], [1, true], [1.4, false]], length: 2}, {events: [[0.5, false], [2, true], [2.9, false], [3, true], [3.4, false], [3.5, true]], length: 4}
  ], [1, 2])
}
