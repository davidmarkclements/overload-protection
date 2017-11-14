'use strict'

var app = require('restify').createServer({
  name: 'myapp',
  version: '1.0.0'
})
var protect = require('../..')('restify')

app.use(protect)

app.get('/', function (req, res) {
  res.send('content')
})

module.exports = app
