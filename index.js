var ObservStruct = require('observ-struct')
var Grid = require('array-grid')
var Observ = require('observ')
var ObservVarhash = require('observ-varhash')
var ObservArray = require('observ-array')
var xtend = require('xtend/mutable')
var computed = require('observ/computed')

var computedDittyGrid = require('./lib/ditty-grid.js')
var computedActiveGrid = require('./lib/active-grid.js')
var computedLoopPosition = require('./lib/loop-position.js')
var computedRecording = require('./lib/recording.js')

module.exports = LoopGrid

function LoopGrid(opts, additionalProperties){
 
  // required options:
  var player = opts.player
  var recorder = opts.recorder

  // optional:
  var shape = opts.shape || [8,8]
  var scheduler = opts.scheduler || null
  var triggerOutput = opts.triggerOutput || null



  var obs = ObservStruct(xtend({
    chunkPositions: ObservVarhash({})
  }, additionalProperties))

  obs.transforms = ObservArray([])

  var soundChunkLookup = {}

  var undos = []
  var redos = []

  var baseLoops = {}
  var currentLoops = {}
  var releases = obs._releases = []

  releases.push(

    // update playback when transforms change
    obs.transforms(refreshCurrent)

  )

  obs.chunkState = Observ([])
  obs.flags = Observ({})
  obs.triggerIds = Observ([])
  obs.loopLength = Observ(8)


  obs.grid = computed([obs.chunkPositions, opts.chunkLookup], function(chunkPositions, chunkLookup){
    var result = Grid([], shape)
    var flags = Grid([], shape)
    var triggerIds = []
    var chunkState = []

    if (chunkPositions){
      soundChunkLookup = {}
      Object.keys(chunkPositions).forEach(function(chunkId){
        var chunk = chunkLookup[chunkId]
        var origin = chunkPositions[chunkId]
        if (chunk && origin){
          chunkState.push({
            id: chunkId, 
            origin: origin, 
            shape: chunk.grid.shape, 
            stride: chunk.grid.stride, 
            node: chunk.node,
            color: chunk.color
          })
          result.place(origin[0], origin[1], chunk.grid)
          for (var k in chunk.flags){
            if (Array.isArray(chunk.flags[k]) && chunk.flags[k].length){
              var index = result.data.indexOf(k)
              if (~index){
                flags.data[index] = chunk.flags[k]
              }
            }
          }
          for (var i=0;i<chunk.grid.data.length;i++){
            if (chunk.grid.data[i] != null){
              triggerIds.push(chunk.grid.data[i])
              soundChunkLookup[chunk.grid.data[i]] = chunk.id
            }
          }
        }
      })
    }

    obs.chunkState.set(chunkState)
    obs.flags.set(flags)
    obs.triggerIds.set(triggerIds)

    return result
  })

  if (triggerOutput){
    obs.playing = computedDittyGrid(triggerOutput, obs.grid)
  }

  if (player){
    obs.active = computedActiveGrid(player, obs.grid)
  }

  if (scheduler){
    obs.loopPosition = computedLoopPosition(scheduler, obs.loopLength)
  }

  if (scheduler && triggerOutput){
    obs.recording = computedRecording(scheduler, triggerOutput, obs.grid, obs.loopLength)
  }

  if (obs.playing && obs.active && obs.recording){

    // for binding to grid visual interface
    obs.gridState = computed([
      obs.grid, obs.playing, obs.active, obs.recording
    ], function(grid, playing, active, recording){
      var length = grid.data.length
      var result = []
      for (var i=0;i<length;i++){
        if (grid.data[i]){
          result[i] = {
            id: grid.data[i],
            isPlaying: playing.data[i],
            isActive: active.data[i],
            isRecording: recording.data[i]
          }
        }
      }
      return {
        grid: Grid(result, grid.shape, grid.stride),
        chunks: obs.chunkState()
      }
    })

  }

  obs.destroy = function(){
    if (obs.playing) obs.playing.destroy()
    if (obs.active) obs.active.destroy()
    if (obs.loopPosition) obs.loopPosition.destroy()
    if (obs.recording) obs.recording.destroy()
    releases.forEach(invoke)
    releases = []
  }

  // grab loops from recorder for all sounds currently in grid and set loop
  obs.store = function(length, start){

    // defaults
    length = length || obs.loopLength()
    start = start == null && opts.scheduler ? 
      opts.scheduler.getCurrentPosition() - length : start

    undos.push(baseLoops)

    var snapshot = obs.triggerIds().reduce(function(result, id){
      result[id] = {
        events: recorder.getLoop(id, start, length), 
        length: length
      }
      return result
    }, {})
    setBase(snapshot)
  }

  obs.transform = function(func, args){
    // transform relative to grid
    var t = {
      func: func,
      args: Array.prototype.slice.call(arguments, 1)
    }

    obs.transforms.push(t)

    return function release(){
      var index = obs.transforms.indexOf(t)
      if (~index){
        obs.transforms.splice(index, 1)
      }
    }
  }

  obs.isTransforming = function(){
    return !!obs.transforms.getLength()
  }

  obs.flatten = function(){
    // flatten transforms
    undos.push(baseLoops)
    targetLoops = currentLoops
    obs.transforms.set([])
    setBase(targetLoops)
  }

  obs.undo = function(){
    var snapshot = undos.pop()
    if (snapshot){
      redos.push(baseLoops)
      setBase(snapshot)
    }
  }

  obs.redo = function(){
    var snapshot = redos.pop()
    if (snapshot){
      undos.push(baseLoops)
      setBase(snapshot)
    }
  }

  return obs

  
  // scoped
  function refreshCurrent(){
    currentLoops = gridTransform(baseLoops, obs.transforms())
    obs.triggerIds().forEach(function(id){
      var channel = currentLoops[id]
      if (channel && channel.events && channel.events.length){
        player.set(id, channel.events, channel.length)
      } else {
        player.set(id, null)
      }
      currentLoops[id] = channel
    })
  }

  function cloneBaseLoop(id){
    if (baseLoops[id] && baseLoops[id].events){
      return {
        events: baseLoops[id].events.concat(),
        length: baseLoops[id].length
      }
    } else {
      return null 
    }
    return baseLoops[id]
  }

  function wrapToLookup(result, value, index){
    var id = obs.grid().data[index]
    if (id != null){
      result[id] = value
    }
    return result
  }

  function performTransform(input, f){
    return f.func.apply(this, [input].concat(f.args||[]))
  }

  function gridTransform(input, transforms){
    if (transforms && transforms.length){
      var soundGrid = obs.grid()
      var data = soundGrid.data.map(cloneBaseLoop)
      var playbackGrid = Grid(data, soundGrid.shape, soundGrid.stride)

      // perform transform
      soundGrid = transforms.reduce(performTransform, playbackGrid)

      // turn back into loop lookup
      return soundGrid.data.reduce(wrapToLookup, {})
    } else {
      return input
    }
  }

  function setBase(snapshot){
    baseLoops = {}
    obs.triggerIds().forEach(function(id){
      baseLoops[id] = snapshot[id]
    })
    refreshCurrent()
  }
}

function invoke(fn){
  return fn()
}