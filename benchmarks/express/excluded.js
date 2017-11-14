'use strict'

var app = require('express')()

app.get('/', function (req, res) {
  res.send('content')
})

module.exports = app
