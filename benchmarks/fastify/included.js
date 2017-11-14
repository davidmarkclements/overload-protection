'use strict'

var http = require('http')
var app = require('fastify')()
var protect = require('../..')('fastify')

app.use(protect)

app.get('/', function (request, reply) {
  reply.send('content')
})

module.exports = http.createServer(app)
