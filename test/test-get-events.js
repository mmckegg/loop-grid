var test = require('tape')
var getEvents = require('../lib/get-events')

test('test loop -> events', function (t) {
  var loop = { length: 4,
    events:
     [ [ 0.5, 0 ],
       [ 1, 1 ],
       [ 1.5, 0 ],
       [ 2, 1.1 ],
       [ 3.5, 0 ],
       [ 3.9, 1.2 ]
     ]
   }

  t.deepEqual(getEvents(loop, 4, 12), [
    [ 4, 1.2 ],
    [ 4.5, 0 ],
    [ 5, 1 ],
    [ 5.5, 0 ],
    [ 6, 1.1 ],
    [ 7.5, 0 ],
    [ 7.9, 1.2 ],
    [ 8.5, 0 ],
    [ 9, 1 ],
    [ 9.5, 0 ],
    [ 10, 1.1 ],
    [ 11.5, 0 ],
    [ 11.9, 1.2 ]
  ])

  t.deepEqual(getEvents(loop, 1.6, 4.3), [
    [ 1.6, 0 ],
    [ 2, 1.1 ],
    [ 3.5, 0 ],
    [ 3.9, 1.2 ]
  ])

  t.deepEqual(getEvents(loop, 4, 4.5), [
    [4, 1.2]
  ])

  t.deepEqual(getEvents(loop, 4, 4.5, 0.6), [ ])
  t.deepEqual(getEvents(loop, 4, 4.5, 0.5), [ [4, 1.2] ])
  t.deepEqual(getEvents(loop, 4.1, 4.5, 0.5), [])

  t.deepEqual(getEvents(null, 1.6, 4.3), [
    [ 1.6, null ]
  ])

  t.end()
})
