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

module.exports = app
