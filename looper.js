var Observ = require('observ')
var computedNextTick = require('./lib/computed-next-tick')
var LoopRecorder = require('loop-recorder')
var ObservArray = require('observ-array')
var ArrayGrid = require('array-grid')
var extend = require('xtend')

var computedRecording = require('./lib/recording')

module.exports = Looper

function Looper(loopGrid){

  var base = Observ([])
  var transforms = ObservArray([])

  var undos = []
  var redos = []

  var swing = loopGrid.context.swing || Observ(0)
  var obs = computedNextTick([base, transforms, swing], function(base, transforms, swing){
    var swingRatio = 0.5 + (swing * (1 / 6))
    if (transforms.length){
      var input = ArrayGrid(base.map(cloneLoop), loopGrid.shape())
      var result = transforms.reduce(performTransform, input)
      return swingLoops(result && result.data || [], swingRatio)
    } else {
      return swingLoops(base, swingRatio)
    }
  })

  obs.transforms = transforms
  obs.recording = computedRecording(loopGrid)

  var recorder = LoopRecorder()
  var context = loopGrid.context

  // record all output events
  loopGrid.onEvent(function (data) {
    if (swing()) {
      var swingRatio = 0.5 + (swing() * (1 / 6))
      data = extend(data, {
        position: unswingPosition(data.position, swingRatio, 2)
      })
    }
    recorder.write(data)
  })

  obs.store = function(){
    var length = loopGrid.loopLength() || 8
    var from = context.scheduler.getCurrentPosition() - length
    var result = loopGrid.targets().map(function (target, i) {
      var isHanging = recorder.getHanging(target, from, length)
      if (isHanging) {
        return { length: length, events: [], held: true }
      } else {
        var events = recorder.getLoop(target, from, length, 0.1)
        if (events && events.length){
          return { length: length, events: events }
        }
      }
    })

    undos.push(base())
    base.set(result)
  }

  obs.flatten = function(){
    obs.refresh()
    undos.push(base())
    base.set(obs())
    transforms.set([])
  }

  obs.undo = function(){
    if (undos.length){
      redos.push(base())
      base.set(undos.pop())
    }
  }

  obs.redo = function(){
    if (redos.length){
      undos.push(base())
      base.set(redos.pop() || [])
    }
  }

  obs.transform = function(func, args){
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

  return obs

  // scoped

  function swingLoops (loops, ratio) {
    if (ratio !== 0.5) {
      return loops.map(function (loop) {
        if (loop) {
          loop = ensureLength(loop, 1/2)

          return {
            events: loop.events.map(function (event) {
              var start = swingPosition(event[0], ratio, 2)
              var end = swingPosition(event[0] + event[1], ratio, 2)
              return [start, end - start].concat(event.slice(2))
            }),
            held: loop.held,
            length: loop.length
          }
        }
      })
    } else {
      return loops
    }
  }
}

function ensureLength (loop, minLength) {
  if (!loop.length || loop.length >= minLength || loop.held) {
    return loop
  } else {
    
    var result = {
      events: loop.events.concat(),
      length: loop.length
    }

    while (result.length < minLength) {
      for (var i=0;i<loop.events.length;i++) {
        var orig = loop.events[i]
        result.events.push([orig[0]+result.length].concat(orig.slice(1)))
      }
      result.length += loop.length
    }

    return result
  }
}

function cloneLoop(loop){
  if (loop && Array.isArray(loop.events)){
    return {
      events: loop.events.concat(),
      length: loop.length,
      held: loop.held
    }
  }
}

function performTransform(input, f){
  return f.func.apply(this, [input].concat(f.args||[]))
}

function unswingPosition (position, center, grid) {
  grid = grid || 1
  position = position * grid
  var rootPos = Math.floor(position)
  var pos = (position % 1)
  var posOffset = pos < center ?
    pos / center * 0.5 : 
    0.5 + ((pos - center) / (1 - center) * 0.5)
  return (rootPos + posOffset) / grid
}

function swingPosition (position, center, grid) {
  grid = grid || 1
  position = position * grid
  var rootPos = Math.floor(position)
  var pos = (position % 1) * 2 - 1
  var posOffset = pos < 0 ?
    (1 + pos) * center : 
    center + pos * (1 - center)
  return (rootPos + posOffset) / grid
}