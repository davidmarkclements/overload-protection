'use strict'

var app = require('express')()
var protect = require('../..')('express')

app.use(protect)

app.get('/', function (req, res) {
  res.send('content')
})

module.exports = app
