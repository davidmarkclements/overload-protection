'use strict'

var Koa = require('koa')
var Router = require('koa-router')
var protect = require('../..')('koa')

var router = new Router()
var app = new Koa()

app.use(protect)

router.get('/', async function (ctx) {
  ctx.body = 'content'
})

app.use(router.routes())
app.listen(3000, function () {
  var req = require('http').get('http://localhost:3000')

  req.on('response', function (res) {
    console.log('got status code', res.statusCode)
    console.log('retry after', res.headers['retry-after'])

    setTimeout(function () {
      console.log('protect.overload after load', protect.overload)
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
