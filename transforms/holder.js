module.exports = Holder

function Holder(transform){
  var release = null

  var holding = false
  var length = 2
  var start = null
  var doneCallback = null

  function refresh(){
    if (holding){
      var oldRelease = release
      release = transform(hold, start, length, holding)
      oldRelease&&oldRelease()
    } else if (release) {
      release()
      release = null
    }
  }

  var self = {
    getLength: function(){
      return length
    },
    setLength: function(value){
      if (length !== value){
        length = value
        refresh()
      }
    },
    start: function(position, indexes, done){
      self.stop()
      start = position
      holding = indexes || []
      doneCallback = done
      refresh()
    },
    stop: function(){
      if (holding){
        holding = false
        refresh()
      }
      if (typeof doneCallback == 'function'){
        doneCallback()
        doneCallback = null
      }
    }
  }

  return self
}

function hold(input, start, length, indexes){
  var end = start + length
  input.data.forEach(function(loop, i){
    if (loop && (!indexes || !indexes.length || ~indexes.indexOf(i))){
      var from = start % loop.length
      var to = end % loop.length
      var events = []

      loop.events.forEach(function(event){
        if (inRange(from, to, event[0])){
          event = event.concat()
          event[0] = event[0] % length
          event[1] = Math.min(event[1], length/2)
          events.push(event)
        }
      })

      input.data[i] = {
        events: events,
        length: length
      }
    }
  })
  return input
}

function inRange(from, to, value){
  if (to > from){
    return value >= from && value < to
  } else {
    return value >= from || value < to
  }
}