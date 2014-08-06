var Grid = require('array-grid')
var Observ = require('observ')
var ObservArray = require('observ-array')
var ObservStruct = require('observ-struct')

module.exports = function LoopGrid(opts){
  // opts: recorder, player, shape
  
  var player = opts.player
  var recorder = opts.recorder
  var shape = opts.shape || [8, 8]

  var chunkLookup = {}
  var chunkRelease = {}
  var soundLookup = {}

  var releases = []

  var self = ObservStruct({
    chunkIds: ObservArray([]),
    grid: Observ(Grid([], shape)),
    active: ObservArray([])
  })

  var undos = []
  var redos = []

  var baseLoops = {}
  var currentLoops = {}

  var transforms = []

  // layout sound ids when chunks change
  releases.push(self.chunkIds(refreshGrid))

  // update active sounds
  player.on('data', onTrigger)
  releases.push(function(){
    player.removeListener('data', onTrigger)
  })

  self.destroy = function(){
    releases.forEach(invoke)
    releases = []
  }

  self.add = function(chunk){
    var value = chunk()

    // avoid duplicates
    if (!chunkLookup[chunk.id]){
      chunkLookup[value.id] = chunk
      chunkRelease[value.id] = chunk(function(newValue){
        if (newValue.id !== value.id){ 
          // move to new id
          chunkLookup[newValue.id] = chunkLookup[value.id]
          chunkRelease[newValue.id] = chunkRelease[value.id]
          chunkLookup[value.id] = null
          chunkRelease[value.id] = null
          var index = self.chunkIds.indexOf(value.id)
          if (~index){
            self.chunkIds.splice(index, 1, value.id)
          }
        }
        value = newValue
        refreshGrid()
      })
      self.chunkIds.push(value.id)
    }
  }

  self.remove = function(chunkId){
    chunkRelease[newValue.id]()
    chunkRelease[value.id] = null
    chunkLookup[value.id] = null
    var index = self.chunkIds.indexOf(value.id)
    if (~index){
      self.chunkIds.splice(index, 1)
    }
  }

  self.getSoundIds = function(){
    var result = []
    var lookup = {}
    var data = self.grid().data
    for (var i=0;i<data.length;i++){
      if (!lookup[data[i]] && data[i] != null){
        result.push(data[i])
      }
    }
    return result
  }

  // grab loops from recorder for all sounds currently in grid and set loop
  self.loopRange = function(start, length){
    undos.push(baseLoops)

    var snapshot = self.getSoundIds().reduce(function(result, id){
      result[id] = {
        events: recorder.getLoop(id, start, length), 
        length: length
      }
      return result
    }, {})
    setBase(snapshot)
  }

  self.transform = function(func, args){
    // transform relative to grid
    var t = {
      func: func,
      args: Array.prototype.slice.call(arguments, 1)
    }

    transforms.push(t)
    refreshCurrent()

    return function release(){
      var index = transforms.indexOf(t)
      if (~index){
        transforms.splice(index, 1)
      }
      refreshCurrent()
    }
  }

  self.flatten = function(){
    // flatten transforms
    undos.push(baseLoops)
    setBase(currentLoops)
  }

  self.undo = function(){
    var snapshot = undos.pop()
    if (snapshot){
      redos.push(baseLoops)
      setBase(snapshot)
    }
  }

  self.redo = function(){
    var snapshot = redos.pop()
    if (snapshot){
      undos.push(baseLoops)
      setBase(snapshot)
    }
  }

  return self


  //// scoped methods

  function onTrigger(data){
    if (data && data.id in soundLookup){
      if (data.event === 'start'){
        self.active.push(data.id)
      } else if (data.event === 'stop'){
        var index = self.active.indexOf(data.id)
        if (~index){
          self.active.splice(index, 1)
        }
      }
    }
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
    var id = self.grid().data[index]
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
      var soundGrid = self.grid()
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

  function refreshCurrent(){
    currentLoops = gridTransform(baseLoops, transforms)
    self.getSoundIds().forEach(function(id){
      var channel = currentLoops[id]
      if (channel && channel.events && channel.events.length){
        player.set(id, channel.events, channel.length)
      } else {
        player.set(id, null)
      }
      currentLoops[id] = channel
    })
  }

  function setBase(snapshot){
    baseLoops = {}
    self.getSoundIds().forEach(function(id){
      baseLoops[id] = snapshot[id]
    })
    refreshCurrent()
  }

  function refreshGrid(){
    var result = Grid([], shape)
    soundLookup = {}
    self.chunkIds.forEach(function(chunkId){
      var chunk = chunkLookup[chunkId] && chunkLookup[chunkId]()
      if (chunk){
        result.place(chunk.origin[0], chunk.origin[1], chunk.grid)
        for (var i=0;i<chunk.grid.data.length;i++){
          if (chunk.grid.data[i] != null){
            soundLookup[chunk.grid.data[i]] = chunk.id
          }
        }
      }
    })

    self.grid.set(result)
  }
}