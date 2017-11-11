'use strict'

var http = require('http')
var server = http.createServer(serve)
var protect = require('../../..')('http')
var { is, comment } = require('tap')

comment('core http integration')

function sleep (msec) {
  var start = Date.now()
  while (Date.now() - start < msec) {}
}

function serve (req, res) {
  if (protect(req, res) === true) return
  res.end('content')
}

server.listen(3000, function () {
  var req = require('http').get('http://localhost:3000')

  req.on('response', function (res) {
    is(res.statusCode, 503)
    is(res.headers['retry-after'], '10')

    setTimeout(function () {
      is(protect.overload, false)
      var req = require('http').get('http://localhost:3000')

      req.on('response', function (res) {
        is(res.statusCode, 200)
        protect.stop()
        process.exit()
      }).end()
    }, parseInt(res.headers['retry-after'], 10))
  }).end()

  sleep(500)
})
