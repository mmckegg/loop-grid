var test = require('tape')
var Selector = require('../selector')
var ObservGrid = require('observ-grid')

test(function(t){
  var grid = ObservGrid([], [3,3])
  var selector = Selector(grid.shape)
  
  var changes = []
  var lastChange = null
  selector(function(change){
    lastChange = change.data
    changes.push(change)
  })

  var endCalled = 0
  selector.start(grid, function(){
    endCalled += 1
  })

  grid.set(0,0, true)
  t.deepEqual(lastChange, [true])

  grid.set(1,1, true)
  t.deepEqual(lastChange, [true, true, undefined, true,true])

  grid.set(0,0, null)
  t.deepEqual(lastChange, [true, true,undefined,true,true])

  grid.set(1,1, null)
  t.deepEqual(lastChange, [true, true,undefined,true,true])

  grid.set(0,0, true)
  t.deepEqual(lastChange, [null, true,undefined,true,true])

  grid.set(0,0, null)
  t.deepEqual(lastChange, [null, true,undefined,true,true])

  grid.set(2,0, true)
  t.deepEqual(lastChange, [null, true,undefined,true,true,,true])

  grid.set(2,0, null)
  t.deepEqual(lastChange, [null, true,undefined,true,true,,true])

  grid.set(2,1, true)
  t.deepEqual(lastChange, [null, true,undefined,true,true,,true,true])

  grid.set(2,1, null)
  t.deepEqual(lastChange, [null, true,undefined,true,true,,true,true])

  selector.stop()
  t.deepEqual(lastChange, [null, true,undefined,true,true,,true,true])
  t.equal(endCalled, 1)

  grid.set(2,2, true) // should be no change as we have stoppped!
  t.deepEqual(lastChange, [null, true,undefined,true,true,,true,true])

  selector.clear()
  t.deepEqual(lastChange, [])

  t.equal(changes.length, 6)
  t.equal(endCalled, 1)

  t.end()
})