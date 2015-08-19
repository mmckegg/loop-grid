var test = require('tape')
var Mover = require('../transforms/mover')

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


  var grid = ObservGrid([], [3,3])
  var mover = Mover(transform)

  var endCalled = 0
  mover.start(grid, [0, 3], function(){
    endCalled += 1
  })

  t.deepEqual(transformedInput, null)

  grid.set(1,1, true)
  t.deepEqual(transformedInput.data, [
    null,{events: [[2,1]], length: 3},,
    null,{events: [[0,1]], length: 2},,
        ,{events: [[1,1]], length: 4}
  ])

  grid.set(1,2, true)
  t.deepEqual(transformedInput.data, [
    null,{events: [[2,1]], length: 3},,
    null,{events: [[0,1]], length: 2},{events: [[0,1]], length: 2},
        ,{events: [[1,1]], length: 4},{events: [[1,1]], length: 4}
  ])

  grid.set(1,1, null)
  t.deepEqual(transformedInput.data, [
    null,{events: [[2,1]], length: 3},,
    null, ,{events: [[0,1]], length: 2},
        , ,{events: [[1,1]], length: 4}
  ])

  t.equal(releaseCalled, 2)
  t.equal(endCalled, 0)
  mover.stop()
  t.equal(releaseCalled, 3)
  t.equal(endCalled, 1)

  t.end()

})


function fakePlaybackGrid(){
  return ArrayGrid([
    {events: [[0,1]], length: 2},{events: [[2,1]], length: 3},,
    {events: [[1,1]], length: 4}
  ], [3,3])
}