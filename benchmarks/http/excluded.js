'use strict'

var http = require('http')
var server = http.createServer(serve)

function serve (req, res) {
  res.end('content')
}

module.exports = server
