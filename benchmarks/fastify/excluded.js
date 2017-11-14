'use strict'

var http = require('http')
var app = require('fastify')()

app.get('/', function (request, reply) {
  reply.send('content')
})

module.exports = http.createServer(app)
