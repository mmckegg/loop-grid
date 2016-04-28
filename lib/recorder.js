module.exports = LoopRecorder

function LoopRecorder () {
  var tracks = {}

  var write = function (id, position, value) {
    var track = tracks[id] = tracks[id] || []
    while (track.length && tracks[id][track.length - 1][0] > position) {
      track.pop()
    }
    track.push([position, value])
  }

  write.truncate = function (to) {
    Object.keys(tracks).forEach(function (id) {
      // ensure 1 item always remains for storing last state
      for (var index = 0; index < tracks[id].length - 1; index++) {
        if (tracks[id][index][0] >= to) break
      }
      if (index) {
        tracks[id].splice(0, index)
      }
    })
  }

  write.trimFrom = function (id, from) {
    var track = tracks[id]
    if (track) {
      var index = track.length
      for (var i = track.length - 1; i >= 0; i--) {
        if (track[i].at >= from) {
          index = i
        } else {
          break
        }
      }
      if (index < track.length) {
        tracks[id].splice(index, track.length - index)
      }
    }
  }

  write.getScheduledTo = function (id) {
    if (tracks[id] && tracks[id].length) {
      return tracks[id][tracks[id].length - 1][0]
    }
  }

  write.getValueAt = function (id, at) {
    if (tracks[id] && tracks[id].length) {
      var track = tracks[id]
      var count = track.length
      for (var i = count - 1; i >= 0; i--) {
        if (track[i][0] <= at) {
          return track[i][1]
        }
      }
    }
    return null
  }

  write.getValuesAt = function (at) {
    return Object.keys(tracks).reduce(function (result, key) {
      result[key] = write.getValueAt(key, at)
      return result
    }, {})
  }

  write.getRange = function (id, from, to) {
    var result = []
    if (tracks[id] && tracks[id].length) {
      var track = tracks[id]
      var count = track.length

      var lastEvent = [0, null]

      for (var i = 0; i < count; i++) {
        var ev = track[i]

        if (ev[0] >= to) {
          break
        }

        if (ev[0] >= from) {
          result.push(ev)
        } else {
          lastEvent = ev
        }
      }

      if (!result.length || result[0][0] > from) {
        result.unshift([from].concat(lastEvent.slice(1)))
      }
    }
    return result
  }

  return write
}
