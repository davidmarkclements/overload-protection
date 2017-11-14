'use strict'
var autocannon = require('autocannon')

var included = require('./included')
var excluded = require('./excluded')

console.log('restify with overload protection:')
included = included.listen(3000)
var instance = autocannon({
  url: 'http://localhost:3000',
  connections: 10,
  pipelining: 1,
  duration: 10
}, function () {
  instance.stop()
  included.close()
  console.log('\nrestify without overload protection:')
  excluded = excluded.listen(3000)
  instance = autocannon({
    url: 'http://localhost:3000',
    connections: 10,
    pipelining: 1,
    duration: 10
  }, function () {
    instance.stop()
    excluded.close()
  })
  autocannon.track(instance, {renderProgressBar: true})
})

// just render results
autocannon.track(instance, {renderProgressBar: true})
