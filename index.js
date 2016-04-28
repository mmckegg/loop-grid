var ArrayGrid = require('array-grid')
var Observ = require('observ')
var ObservDefault = require('./lib/observ-default')
var ObservStruct = require('observ-struct')
var Event = require('geval')
var computed = require('observ/computed')
var setImmediate = require('setimmediate2').setImmediate
var getEvents = require('./lib/get-events')
var Recorder = require('./lib/recorder')
var deepEqual = require('deep-equal')

module.exports = LoopGrid

function LoopGrid (context) {
  var obs = ObservStruct({
    shape: ObservDefault([8, 8]),
    loops: ObservDefault([]),
    targets: ObservDefault([]),
    loopLength: ObservDefault(8)
  })

  var listen = Listener()
  var pushHistory = Recorder()

  obs.loopPosition = Observ([0, 8])
  obs.context = context

  // state layers
  obs.grid = computed([obs.targets, obs.shape], ArrayGrid)
  obs.playing = Observ(ArrayGrid([], obs.shape()))
  obs.active = computed([obs.loops, obs.shape], function (loops, shape) {
    return ArrayGrid(loops.map(function (loop) {
      return (loop && loop.length && Array.isArray(loop.events) && loop.events.length)
    }), shape)
  })

  var currentlyPlaying = {}
  var overriding = {}
  var pendingPlayingUpdate = false
  var lastPosition = -1
  var scheduledTo = 0

  obs.onEvent = Event(function (broadcast) {
    obs.triggerEvent = broadcast

    obs.triggerEvent = function (event) {
      if (event.id) {
        if (event.event === 'start') {
          overriding[event.id] = true
          currentlyPlaying[event.id] = true
          pushHistory(event.id, event.position, true)
          broadcast(event)
        } else {
          overriding[event.id] = false
          currentlyPlaying[event.id] = false
          pushHistory(event.id, event.position, false)
          broadcast(event)
          obs.reschedule(event.id)
        }

        refreshPlaying()
      }
    }

    obs.reschedule = function (id) {
      var schedule = {
        from: context.scheduler.getCurrentPosition(),
        to: scheduledTo,
        time: context.audio.currentTime,
        beatDuration: context.scheduler.getBeatDuration(),
        rescheduling: true
      }

      pushHistory.trimFrom(id, schedule.from)

      // broadcast({
      //   id: id,
      //   event: 'cancel',
      //   position: schedule.from,
      //   time: schedule.time
      // })

      var index = obs.targets().indexOf(id)
      if (~index) {
        var loop = obs.loops()[index]
        scheduleRange(id, loop, schedule)
      }
    }

    listen(context.scheduler.onSchedule, function (schedule) {
      var displaySchedule = getDisplaySchedule(schedule)

      var targets = obs.targets()
      targets.forEach(function (id, index) {
        var loop = obs.loops()[index]
        scheduleRange(id, loop, schedule)
        scheduleDisplay(id, loop, displaySchedule)
      })

      // stop any notes that are no longer targets
      var current = pushHistory.getValuesAt(schedule.from)
      Object.keys(current).forEach(function (id) {
        if (!~targets.indexOf(id)) {
          if (current[id]) {
            broadcast({
              id: id,
              event: 'stop',
              position: schedule.from,
              time: schedule.time
            })
          }
        }
      })

      // update playback position
      if (Math.floor(displaySchedule.from * 10) > Math.floor(lastPosition * 10)) {
        var loopLength = obs.loopLength() || 8
        var pos = Math.floor(displaySchedule.from * 10) % (loopLength * 10)
        obs.loopPosition.set([pos / 10, loopLength])
        lastPosition = displaySchedule.from
      }

      scheduledTo = schedule.to
    })

    listen.event(context.scheduler, 'stop', function () {
      var position = context.scheduler.getCurrentPosition()
      var current = pushHistory.getValuesAt(position)
      Object.keys(current).forEach(function (id) {
        if (current[id]) {
          broadcast({
            id: id,
            event: 'stop',
            position: position,
            time: context.audio.currentTime
          })
        }
      })
    })

    function scheduleRange (id, loop, schedule) {
      getEvents(loop, schedule.from, schedule.to, 0.5).forEach(function (event) {
        var current = pushHistory.getValueAt(id, event[0])
        if (current !== event[1] || (!event[1] && schedule.rescheduling)) {
          var delta = (event[0] - schedule.from) * schedule.beatDuration
          if (!overriding[id]) {
            pushHistory(id, event[0], event[1])
            broadcast({
              id: id,
              event: event[1] ? 'start' : 'stop',
              position: event[0],
              time: schedule.time + delta
            })
          }
        }
      })
    }
  })

  var lastLoops = []
  obs.loops(function (loops) {
    for (var i = 0; i < obs.targets().length; i++) {
      if (loops[i] !== lastLoops[i] && !deepEqual(loops[i], lastLoops[i])) {
        obs.reschedule(obs.targets()[i])
      }
    }
    lastLoops = loops
  })

  obs.onEvent(function (event) {
    if (context.triggerEvent) {
      // send events
      context.triggerEvent(event)
    }
  })

  obs.destroy = function () {
    listen.releaseAll()
  }

  return obs

  // scoped
  function scheduleDisplay (id, loop, schedule) {
    getEvents(loop, schedule.from, schedule.to, 0.5).forEach(function (event) {
      if (!overriding[id]) {
        currentlyPlaying[id] = event[1]
        refreshPlaying()
      }
    })
  }

  function refreshPlaying () {
    if (!pendingPlayingUpdate) {
      pendingPlayingUpdate = true
      setImmediate(refreshPlayingNow)
    }
  }

  function refreshPlayingNow () {
    pendingPlayingUpdate = false
    var playing = []
    var targets = obs.targets()
    var shape = obs.shape()
    var max = Array.isArray(shape) && shape[0] * shape[1] || 0
    for (var i = 0; i < max; i++) {
      if (currentlyPlaying[targets[i]]) {
        playing[i] = true
      }
    }
    obs.playing.set(ArrayGrid(playing, shape))
  }

  function getDisplaySchedule (schedule) {
    var currentPosition = context.scheduler.getCurrentPosition()
    var difference = schedule.to - schedule.from
    return {
      from: currentPosition,
      to: currentPosition + difference,
      time: context.audio.currentTime,
      beatDuration: schedule.beatDuration
    }
  }
}

function Listener () {
  var releases = []

  function listen (target, listener) {
    releases.push(target(listener))
  }

  listen.event = function (emitter, event, listener) {
    emitter.on(event, listener)
    releases.push(emitter.removeListener.bind(emitter, event, listener))
  }

  listen.releaseAll = function () {
    while (releases.length) {
      releases.pop()()
    }
  }

  return listen
}
