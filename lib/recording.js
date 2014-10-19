var Observ = require('observ')
var ArrayGrid = require('array-grid')

module.exports = function(scheduler, dittyStream, grid, loopLength){

  var obs = Observ(ArrayGrid([], grid().shape, grid().stride))
  var lastTriggeredAt = obs.lastTriggeredAt = {}
  var recording = {}

  scheduler.on('data', onSchedule)
  dittyStream.on('data', onPlayback)

  obs.destroy = function(){
    scheduler.removeListener('data', onSchedule)
    dittyStream.removeListener('data', onPlayback)
  }

  return obs



  /// scoped

  function onSchedule(schedule){
    var changed = false
    Object.keys(lastTriggeredAt).forEach(function(key){
      var value = (lastTriggeredAt[key] > schedule.to - loopLength())
      if (value != recording[key]){
        recording[key] = value
        changed = true
      }
    })
    if (changed){
      var data = []
      grid().data.forEach(applyTrueIfLookup, {
        lookup: recording, 
        target: data
      })
      obs.set(ArrayGrid(data, grid().shape, grid().stride))
    }
  }

  function onPlayback(data){
    lastTriggeredAt[data.id] = data.position
  }
}

function applyTrueIfLookup(value, index){
  if (this.lookup[value]){
    this.target[index] = true
  }
}