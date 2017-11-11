'use strict'

var app = require('fastify')()
var protect = require('../..')('fastify')

app.use(protect)

app.get('/', function (request, reply) {
  reply.send('content')
})

app.listen(3000, function () {
  var req = require('http').get('http://localhost:3000')

  req.on('response', function (res) {
    console.log('got status code', res.statusCode)
    console.log('retry after', res.headers['retry-after'])

    setTimeout(function () {
      console.log('protect.overload after load', protect.overLoad)
      var req = require('http').get('http://localhost:3000')

      req.on('response', function (res) {
        console.log('got status code', res.statusCode)

        protect.stop()
        process.exit()
      }).end()
    }, parseInt(res.headers['retry-after'], 10))
  }).end()

  setImmediate(function () {
    console.log('eventLoopDelay after active sleeping', protect.eventLoopDelay)
  })

  sleep(500)
})

function sleep (msec) {
  var start = Date.now()
  while (Date.now() - start < msec) {}
}
