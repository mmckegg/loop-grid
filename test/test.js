var test = require('tape')
var LoopGrid = require('../')
var Recorder = require('loop-recorder')
var Ditty = require('ditty')
var Observ = require('observ')
var ArrayGrid = require('array-grid')
var ObservVarhash = require('observ-varhash')

test('chunks, loops and stuff', function(t){

  var player = Ditty()
  var recorder = Recorder()
  var chunkLookup = ObservVarhash({
    drums: Observ({
      id: 'drums',
      grid: ArrayGrid(['kick', 'snare', 'hihat', 'openhat'], [4,1], [1,4])
    }),
    synth: Observ({
      id: 'synth',
      grid: ArrayGrid(['A1','B1','C2','D2','E2','F2','G2','A2'], [4,4], [1, -4])
    })
  })

  var loopGrid = LoopGrid({
    shape: [8, 8],
    recorder: recorder,
    player: player,
    chunkLookup: chunkLookup
  })

  loopGrid.set({
    chunkPositions: {
      drums: [2,0],
      synth: [1,3]
    }
  })


  // normally the rest would be on next-tick. Let's force it
  //loopGrid.forceRefresh()

  var result = loopGrid.grid()
  t.equal(result.get(3,0), 'snare')
  t.equal(result.get(5,0), 'openhat')
  t.equal(result.get(1,6), 'A1')
  t.equal(result.get(2,6), 'B1')
  t.equal(result.get(3,5), 'G2')
  t.equal(result.get(4,5), 'A2')

  // move the drums one unit to the right
  loopGrid.chunkPositions.put('drums', [3,0])
  //loopGrid.forceRefresh()
  var result = loopGrid.grid()
  t.equal(result.get(4,0), 'snare')
  t.equal(result.get(6,0), 'openhat')

  recorder.write({event: 'start', id: 'kick', position: 0})
  recorder.write({event: 'stop', id: 'kick', position: 0.2})
  recorder.write({event: 'start', id: 'snare', position: 1})
  recorder.write({event: 'stop', id: 'snare', position: 1.2})
  recorder.write({event: 'start', id: 'kick', position: 2})
  recorder.write({event: 'stop', id: 'kick', position: 0.2})
  recorder.write({event: 'start', id: 'snare', position: 3})
  recorder.write({event: 'stop', id: 'snare', position: 3.2})

  // loop range
  loopGrid.loopRange(0, 4)
  t.same(player.getDescriptors(), [ 
    { id: 'kick', 
      events: [ [ 0, 0.2 ], [ 2, 2 ] ], 
      length: 4 
    }, 
    { id: 'snare', 
      events: [ [ 1, 0.2 ], [ 3, 0.2 ] ], 
      length: 4 
    } 
  ])

  // transform

  var releaseFirstTransform = loopGrid.transform(function(input){
    var kick = input.get(3,0)
    kick.length = 2
    kick.events.length = 1
    return input
  })

  t.same(player.getDescriptors(), [ 
    { id: 'kick', 
      events: [ [ 0, 0.2 ] ], 
      length: 2 
    }, 
    { id: 'snare', 
      events: [ [ 1, 0.2 ], [ 3, 0.2 ] ], 
      length: 4 
    } 
  ])

  var releaseSecondTransform = loopGrid.transform(function(input){
    var kick = input.get(3,0)
    input.set(4,0, kick)
    return input
  })

  t.same(player.getDescriptors(), [ 
    { id: 'kick', 
      events: [ [ 0, 0.2 ] ], 
      length: 2 
    }, 
    { id: 'snare', 
      events: [ [ 0, 0.2 ] ], 
      length: 2 
    } 
  ])

  releaseFirstTransform()

  t.same(player.getDescriptors(), [ 
    { id: 'kick', 
      events: [ [ 0, 0.2 ], [ 2, 2 ] ], 
      length: 4 
    }, 
    { id: 'snare',  // snare should still be the same as kick because of second transform
      events: [ [ 0, 0.2 ], [ 2, 2 ] ], 
      length: 4 
    } 
  ])

  // flatten and it should no longer be possible release transform
  loopGrid.flatten()
  releaseSecondTransform()
  t.same(player.getDescriptors(), [ 
    { id: 'kick', 
      events: [ [ 0, 0.2 ], [ 2, 2 ] ], 
      length: 4 
    }, 
    { id: 'snare',
      events: [ [ 0, 0.2 ], [ 2, 2 ] ], 
      length: 4 
    } 
  ])

  loopGrid.undo() // should now be back to original loops
  t.same(player.getDescriptors(), [ 
    { id: 'kick', 
      events: [ [ 0, 0.2 ], [ 2, 2 ] ], 
      length: 4 
    }, 
    { id: 'snare', 
      events: [ [ 1, 0.2 ], [ 3, 0.2 ] ], 
      length: 4 
    } 
  ])

  loopGrid.redo()
  t.same(player.getDescriptors(), [ 
    { id: 'kick', 
      events: [ [ 0, 0.2 ], [ 2, 2 ] ], 
      length: 4 
    }, 
    { id: 'snare', 
      events: [ [ 0, 0.2 ], [ 2, 2 ] ], 
      length: 4 
    } 
  ])

  t.end()
})