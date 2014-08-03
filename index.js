var Grid = require('array-grid')
var Observ = require('observ-array')
var ObservArray = require('observ-array')
var ObservStruct = require('observ-struct')

module.exports = function LoopGrid(opts){
  // opts: recorder, loop, shape
  
  var loop = opts.loop
  var recorder = opts.recorder
  var shape = opts.shape || [8, 8]

  var chunkLookup = {}
  var chunkRelease = {}

  var releases = []

  var self = ObservStruct({
    chunkIds: ObservArray([]),
    grid: ObservStuct({
      data: [],
      shape: [8, 8]
    }),
    active: Observ([])
  })

  // layout sound ids when chunks change
  releases.push(self.chunkIds(refreshGrid))

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
      chunkIds.push(value.id)
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

  self.destroy = function(){
    // release all handlers
  }

  self.loopRange = function(start, length){
    // grab loops from recorder for all sounds currently in grid and set loop
  }

  self.transform = function(func, args){
    // transform relative to grid
  }

  self.undo = function(){
    // keep snapshots of previous loops for all sounds currently in grid
  }

  self.redo = function(){

  }

  self.bounce = function(){
    // flatten transforms
  }



  return self


  //// scoped methods

  function refreshGrid(){
    var result = Grid(shape[0], shape[1])
    self.chunkIds().forEach(function(chunk){
      result.place(chunk.origin[0], chunk.origin[1], Grid(chunk.sounds, chunk.shape, chunk.stride))
    })
    self.grid.set(result)
  }
}