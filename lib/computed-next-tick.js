var Observ = require('Observ')
var nextTick = require('next-tick')

module.exports = computed

function computed(observables, lambda) {
    var values = observables.map(function (o) {
        return o()
    })

    var result = Observ(lambda.apply(null, values))
    var pending = false

    observables.forEach(function (o, index) {
        o(function (newValue) {
            values[index] = newValue
            if (!pending){
                pending = true
                nextTick(result.refresh)
            }
        })
    })

    result.refresh = function(){
        pending = false
        result.set(lambda.apply(null, values))
    }

    return result
}