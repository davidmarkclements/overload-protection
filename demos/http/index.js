'use strict'

var http = require('http')
var server = http.createServer(serve)
var protect = require('../..')('http')

function sleep (msec) {
  var start = Date.now()
  while (Date.now() - start < msec) {}
}

function serve (req, res) {
  if (protect(req, res) === true) return
  res.end('content')
}

server.listen(0, function () {
  var req = http.get(server.address())

  req.on('response', function (res) {
    console.log('got status code', res.statusCode)
    console.log('retry after', res.headers['retry-after'])

    setTimeout(function () {
      console.log('protect.overload after load', protect.overload)
      var req = http.get(server.address())

      req.on('response', function (res) {
        console.log('got status code', res.statusCode)

        protect.stop()
        server.close()
      }).end()
    }, parseInt(res.headers['retry-after'], 10))
  }).end()

  setImmediate(function () {
    console.log('eventLoopDelay after active sleeping', protect.eventLoopDelay)
  })

  sleep(500)
})
