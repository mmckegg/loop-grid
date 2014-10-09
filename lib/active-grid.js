var Observ = require('observ')
var ArrayGrid = require('array-grid')

module.exports = midiGrid
function midiGrid(player, mapping){

  var obs = Observ()

  var lastTriggeredAt = obs.lastTriggeredAt = {}
  var updating = false
  var active = {}

  player.on('change', onData)

  obs.destroy = function(){
    player.removeListener('change', onData)
  }

  doUpdate()
  return obs


  // scoped
  function onData(data){
    var value = data.events && data.events.length && true || null
    if (value){
      active[data.id] = true
    } else {
      ;delete active[data.id]
    }
    queueUpdate()
  }

  function queueUpdate(data){
    if (!updating){
      updating = true
      requestAnimationFrame(doUpdate)
    }
  }

  function lookupActive(id){
    return active[id]
  }

  function doUpdate(){
    console.log(active)
    updating = false
    var grid = typeof mapping == 'function' ? mapping() : mapping
    var data = grid.data.map(lookupActive)
    obs.set(ArrayGrid(data, grid.shape, grid.stride))
  }
}