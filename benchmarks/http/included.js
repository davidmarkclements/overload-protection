'use strict'

var http = require('http')
var server = http.createServer(serve)
var protect = require('../..')('http')

function serve (req, res) {
  if (protect(req, res) === true) return
  res.end('content')
}

module.exports = server
