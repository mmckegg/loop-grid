var ArrayGrid = require('array-grid')

var Observ = require('observ')
var ObservDefault = require('./lib/observ-default')

var ObservStruct = require('observ-struct')
var Event = require('geval')

var computed = require('observ/computed')
var nextTick = require('next-tick')

var NO_TRANSACTION = {}

module.exports = LoopGrid

function LoopGrid(context){

  // required context: scheduler (instance of Bopper), 
  // optional context: triggerEvent (function(event))

  var obs = ObservStruct({
    shape: ObservDefault([8,8]),
    loops: ObservDefault([]),
    targets: ObservDefault([]),
    loopLength: ObservDefault(8)
  })

  obs.loopPosition = Observ([0,8])
  obs.context = context

  obs.onEvent = Event(function(broadcast){
    obs.triggerEvent = broadcast
  })

  var loopLookup = computed([obs.loops, obs.targets], function(loops, targets){
    var result = {}
    var shape = obs.shape()
    var max = Array.isArray(shape) && shape[0] * shape[1] || 0
    for (var i=0;i<max;i++){
      var id = targets[i]
      var loop = loops[i]
      if (id && loop){
        result[id] = loop
      }
    }
    return result
  })

  var pendingPlayingUpdate = false
  var currentlyPlaying = {}
  var lastPosition = -1

  var removeStopListener = watchEvent(context.scheduler, 'stop', function(){
    for (var i=globalQueue.length-1;i>=0;i--){
      var item = globalQueue[i]
      if (item.event === 'stop'){
        item.time = context.audio.currentTime
        globalQueue.splice(i, 1)
        obs.triggerEvent(item)
      }
    }
  })

  var globalQueue = []
  var removeScheduleListener = watchEvent(context.scheduler, 'data', function(schedule){

    var from = schedule.from
    var to = schedule.to
    var time = schedule.time
    var nextTime = schedule.time + schedule.duration
    var beatDuration = schedule.beatDuration
    var loopLength = obs.loopLength() || 8

    // schedule queued events
    for (var i=globalQueue.length-1;i>=0;i--){
      var item = globalQueue[i]
      if (to > item.position || shouldSendImmediately(item, loopLookup()[item.id])){
        if (to > item.position){
          var delta = (item.position - from) * beatDuration
          item.time = time + delta
        } else {
          item.time = time
          item.position = from
        }
        globalQueue.splice(i, 1)
        obs.triggerEvent(item)
      }
    }

    var localQueue = []
    var shape = obs.shape()
    var max = Array.isArray(shape) && shape[0] * shape[1] || 0

    var loops = obs.loops()
    var targets = obs.targets()

    // main scheduling
    for (var i=0;i<max;i++){
      var id = targets[i]
      var loop = loops[i]
      addEventsToQueue(id, loop, time, from, to, beatDuration, localQueue)
    }

    localQueue.sort(compare)

    // trigger events now, or queue for later
    for (var i=0;i<localQueue.length;i++){
      var item = localQueue[i]
      if (item.time < nextTime){
        obs.triggerEvent(item)
      } else {
        globalQueue.push(item)
      }
    }
    
    if (Math.floor(schedule.from*10) > Math.floor(lastPosition*10)){
      var pos = Math.floor(schedule.from*10) % (loopLength*10)
      obs.loopPosition.set([pos/10, loopLength])
      lastPosition = schedule.from
    }

  })

  obs.onEvent(function(event){
    if (context.triggerEvent){
      // send events
      context.triggerEvent(event)
    }

    // track active
    if (event.event === 'start'){
      currentlyPlaying[event.id] = true
    } else if (event.event === 'stop'){
      currentlyPlaying[event.id] = false
    }

    if (!pendingPlayingUpdate){
      pendingPlayingUpdate = true
      nextTick(refreshPlaying)
    }

  })

  function refreshPlaying(){
    pendingPlayingUpdate = false
    var playing = []
    var targets = obs.targets()
    var shape = obs.shape()
    var max = Array.isArray(shape) && shape[0] * shape[1] || 0
    for (var i=0;i<max;i++){
      if (currentlyPlaying[targets[i]]){
        playing[i] = currentlyPlaying[targets[i]]
      }
    }
    obs.playing.set(ArrayGrid(playing, shape))
  }

  // state layers
  obs.grid = computed([obs.targets, obs.shape], ArrayGrid)
  obs.playing = Observ(ArrayGrid([], obs.shape()))
  obs.active = computed([obs.loops, obs.shape], function(loops, shape){
    return ArrayGrid(loops.map(function(loop){
      return (loop && loop.length && Array.isArray(loop.events) && loop.events.length)
    }), shape)
  })

  obs.destroy = function(){
    removeScheduleListener()
    removeStopListener()
  }

  return obs

  //
}

function shouldSendImmediately(message, loop){
  return message.event === 'stop' && (!loop || !loop.length)
}

function watchEvent(emitter, event, listener){
  emitter.on(event, listener)
  return emitter.removeListener.bind(emitter, event, listener)
}

function compare(a,b){
  return a.time-b.time
}

function getAbsolutePosition(pos, start, length){
  pos = pos % length
  var micro = start % length
  var position = start+pos-micro
  if (position < start){
    return position + length
  } else {
    return position
  }
}

function addEventsToQueue(id, loop, time, from, to, beatDuration, queue){
  if (id && loop && Array.isArray(loop.events)){
    var events = loop.events
    var loopLength = loop.length

    for (var j=0;j<events.length;j++){

      var event = events[j]
      var startPosition = getAbsolutePosition(event[0], from, loopLength)
      var endPosition = startPosition + event[1]

      if (startPosition >= from && startPosition < to){

        var delta = (startPosition - from) * beatDuration
        var duration = event[1] * beatDuration
        var startTime = time + delta
        var endTime = startTime + duration
        
        queue.push({
          id: id,
          event: 'start',
          position: startPosition,
          args: event.slice(4),
          time: startTime
        })

        queue.push({
          id: id,
          event: 'stop',
          position: endPosition,
          args: event.slice(4),
          time: endTime
        })
      }
    }

  }
}
