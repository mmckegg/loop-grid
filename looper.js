var Observ = require('observ')
var computedNextTick = require('./lib/computed-next-tick')
var LoopRecorder = require('loop-recorder')
var ObservArray = require('observ-array')
var ArrayGrid = require('array-grid')

var computedRecording = require('./lib/recording')

module.exports = Looper

function Looper(loopGrid){

  var base = Observ([])
  var transforms = ObservArray([])

  var undos = []
  var redos = []

  var obs = computedNextTick([base, transforms], function(base, transforms){
    if (transforms.length){
      var input = ArrayGrid(base.map(cloneLoop), loopGrid.shape())
      var result = transforms.reduce(performTransform, input)
      return result && result.data || []
    } else {
      return base
    }
  })

  obs.transforms = transforms
  obs.recording = computedRecording(loopGrid)

  var recorder = LoopRecorder()
  var context = loopGrid.context

  // record all output events
  loopGrid.onEvent(recorder.write.bind(recorder))

  obs.store = function(){
    var length = loopGrid.loopLength() || 8
    var from = context.scheduler.getCurrentPosition() - length
    var result = loopGrid.targets().map(function(target, i){
      var events = recorder.getLoop(target, from, length, 0.1)
      if (events && events.length){
        return { length: length, events: events }
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
}

function cloneLoop(loop){
  if (loop && Array.isArray(loop.events)){
    return {
      events: loop.events.concat(),
      length: loop.length
    }
  }
}

function performTransform(input, f){
  return f.func.apply(this, [input].concat(f.args||[]))
}