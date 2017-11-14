'use strict'

var Koa = require('koa')
var Router = require('koa-router')

var router = new Router()
var app = new Koa()

router.get('/', async function (ctx) {
  ctx.body = 'content'
})

app.use(router.routes())

module.exports = app
