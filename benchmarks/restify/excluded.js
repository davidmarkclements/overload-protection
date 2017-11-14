'use strict'

var app = require('restify').createServer({
  name: 'myapp',
  version: '1.0.0'
})

app.get('/', function (req, res) {
  res.send('content')
})

module.exports = app
