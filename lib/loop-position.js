var Observ = require('observ')
module.exports = function(scheduler, loopLength){
  var obs = Observ(0)
  var lastPosition = -1

  scheduler.on('data', onSchedule)

  function onSchedule(schedule){
    if (Math.floor(schedule.from*10) > Math.floor(lastPosition*10)){
      var pos = Math.floor(schedule.from*10) % (loopLength()*10)
      obs.set(pos/10)
      lastPosition = schedule.from
    }
  }

  obs.destroy = function(){
    scheduler.removeListener('data', onSchedule)
  }

  return obs
}