var Grid = require('array-grid')
var Observ = require('observ')
var ObservArray = require('observ-array')
var ObservStruct = require('observ-struct')
var nextTick = require('next-tick')
var xtend = require('xtend/mutable')

module.exports = function LoopGrid(opts, additionalProperties){
  // opts: recorder, player, shape
  
  var gridRefreshQueued = false
  var player = opts.player
  var recorder = opts.recorder
  var shape = opts.shape || [8, 8]

  var chunkLookup = {}
  var originLookup = {}
  var chunkRelease = {}
  var soundLookup = {}

  var releases = []

  var self = ObservStruct(xtend({
    chunkIds: ObservArray([]),
    grid: Observ(Grid([], shape)),
    flags: Observ(Grid([], shape)),
    active: ObservArray([]),
    transforms: ObservArray([])
  }, additionalProperties))

  var undos = []
  var redos = []

  var baseLoops = {}
  var currentLoops = {}

  releases.push(

    // update active sounds
    watchPlayback(onTrigger),

    // update playback when transforms change
    self.transforms(function(value){
      refreshCurrent()
    },

    // layout sound ids when chunks change
    self.chunkIds(refreshGrid)

  ))

  self.destroy = function(){
    releases.forEach(invoke)
    releases = []
  }

  self.add = function(chunk, originX, originY){
    var value = chunk()

    // avoid duplicates
    if (!chunkLookup[chunk.id]){
      chunkLookup[value.id] = chunk
      if (originX != null && originY != null){
        originLookup[value.id] = [originX, originY]
      }

      if (!originLookup){
        originLookup[value.id] = [0, 0]
      }

      chunkRelease[value.id] = chunk(function(newValue){
        if (newValue.id !== value.id){ 
          // move to new id
          chunkLookup[newValue.id] = chunkLookup[value.id]
          chunkRelease[newValue.id] = chunkRelease[value.id]
          originLookup[newValue.id] = originLookup[value.id]
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

  self.setOrigin = function(chunkId, originX, originY){
    originLookup[chunkId] = [originX, originY]
    if (chunkLookup[chunkId]){
      refreshGrid()
    }
  }

  self.remove = function(chunkId){
    if (chunkLookup[chunkId]){
      chunkRelease[chunkId]()
      chunkRelease[chunkId] = null
      chunkLookup[chunkId] = null
      var index = self.chunkIds.indexOf(chunkId)
      if (~index){
        self.chunkIds.splice(index, 1)
      }
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

    self.transforms.push(t)

    return function release(){
      var index = self.transforms.indexOf(t)
      if (~index){
        self.transforms.splice(index, 1)
      }
    }
  }

  self.isTransforming = function(){
    return !!self.transforms.getLength()
  }

  self.flatten = function(){
    // flatten transforms
    undos.push(baseLoops)
    targetLoops = currentLoops
    self.transforms.set([])
    setBase(targetLoops)
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

  self.forceRefresh = function(){
    refreshGridNow()
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
    currentLoops = gridTransform(baseLoops, self.transforms())
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
    // batch grid refresh
    if (!gridRefreshQueued){
      nextTick(refreshGridNow)
      gridRefreshQueued = true
    }
  }

  function watchPlayback(func){
    player.on('data', func)
    return function(){
      player.removeListener('data', func)
    }
  }

  function refreshGridNow(){
    gridRefreshQueued = false
    var result = Grid([], shape)
    var flags = Grid([], shape)
    soundLookup = {}
    self.chunkIds.forEach(function(chunkId){
      var chunk = chunkLookup[chunkId] && chunkLookup[chunkId]()
      var origin = originLookup[chunkId]
      if (chunk && origin){
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
            soundLookup[chunk.grid.data[i]] = chunk.id
          }
        }
      }
    })
    self.grid.set(result)
    self.flags.set(flags)
  }
}

function invoke(func){
  return func()
}