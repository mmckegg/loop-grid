var Observ = require('observ')
var ArrayGrid = require('array-grid')

module.exports = midiGrid
function midiGrid(dittyStream, mapping){

  var obs = Observ()

  var lastTriggeredAt = obs.lastTriggeredAt = {}
  var updating = false
  var playing = {}

  dittyStream.on('data', onData)

  obs.destroy = function(){
    dittyStream.removeListener('data', onData)
  }

  doUpdate()
  return obs


  // scoped
  function onData(data){
    lastTriggeredAt[data.id] = data.position
    if (data.event === 'start'){
      playing[data.id] = 1
    } else if (data.event === 'stop'){
      ;delete playing[data.id]
    }
    queueUpdate()
  }

  function queueUpdate(data){
    if (!updating){
      updating = true
      requestAnimationFrame(doUpdate)
    }
  }

  function lookupPlaying(id){
    return playing[id]
  }

  function doUpdate(data){
    updating = false
    var grid = typeof mapping == 'function' ? mapping() : mapping
    var data = grid.data.map(lookupPlaying)
    obs.set(ArrayGrid(data, grid.shape, grid.stride))
  }
}