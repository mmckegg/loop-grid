var test = require('tape')
var Suppressor = require('../transforms/suppressor')

var ObservGrid = require('observ-grid')
var ArrayGrid = require('array-grid')

test(function(t){
  var transformedInput = null
  var releaseCalled = 0
  function transform(func, arg1, arg2){
    var input = fakePlaybackGrid()
    transformedInput = func(input, arg1, arg2)
    t.equal(input, transformedInput)
    return function(){
      releaseCalled += 1
    }
  }

  var suppressor = Suppressor(transform, [3,3])

  var endCalled = 0
  suppressor.start([], function(){
    endCalled += 1
  })

  t.deepEqual(transformedInput.data, [
    {events: [], length: 2},{events: [], length: 3},,
    {events: [], length: 4}
  ])

  suppressor.stop()
  t.equal(releaseCalled, 1)
  t.equal(endCalled, 1)

  suppressor.start([0,3], function(){
    endCalled += 1
  })

  t.deepEqual(transformedInput.data, [
    {events: [], length: 2},{events: [[2,1]], length: 3},,
    {events: [], length: 4}
  ])

  suppressor.start([1], function(){
    endCalled += 1
  })
  t.equal(releaseCalled, 2)
  t.equal(endCalled, 2)

  t.deepEqual(transformedInput.data, [
    {events: [[0,1]], length: 2},{events: [], length: 3},,
    {events: [[1,1]], length: 4}
  ])

  t.end()


})

function fakePlaybackGrid(){
  return ArrayGrid([
    {events: [[0,1]], length: 2},{events: [[2,1]], length: 3},,
    {events: [[1,1]], length: 4}
  ], [3,3])
}