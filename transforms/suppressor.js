var Observ = require('observ')
var ArrayGrid = require('array-grid')

module.exports = function(transform, shape, stride){

  var self = Observ(ArrayGrid([], resolve(shape), resolve(stride)))

  var release = null
  var doneCallback = null

  var set = self.set
  self.set = null

  self.start = function(suppressIndexes, done){
    self.stop()

    suppressIndexes = suppressIndexes || []

    // transform
    release = transform(suppress, suppressIndexes)

    // update observable grid
    var data = suppressIndexes.reduce(function(result, index){
      result[index] = true
      return result
    }, [])

    set(ArrayGrid(data, resolve(shape), resolve(stride)))

    doneCallback = done
  }

  self.stop = function(){
    if (release){
      set(ArrayGrid([], resolve(shape), resolve(stride)))
      release()
      release = null
      if (typeof doneCallback == 'function') {
        doneCallback()
        done = null
      }
    }
  }

  return self

}

function suppress(input, indexes){
  input.data.forEach(function(loop, i){
    if (loop && (!indexes || !indexes.length || ~indexes.indexOf(i))){
      loop.events = []
    }
  })
  return input
}

function resolve(obs){
  return typeof obs === 'function' ? obs() : obs
}