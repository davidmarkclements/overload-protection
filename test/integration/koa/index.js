'use strict'
var http = require('http')
var Koa = require('koa')
var Router = require('koa-router')
var protection = require('../../..')
var test = require('tap').test

function block (n) {
  while (n--) { JSON.parse(JSON.stringify(require('../../../package.json'))) }
}

test('sends 503 when event loop is overloaded, per maxEventLoopDelay', function (t) {
  var protect = protection('koa', {
    maxEventLoopDelay: 1
  })

  var app = new Koa()

  app.use(protect)

  var server = app.listen(3000, function () {
    var req = http.get('http://localhost:3000')
    block(50000)
    req.on('response', function (res) {
      t.is(res.statusCode, 503)
      protect.stop()
      server.close()
      t.end()
    }).end()
  })
})

test('sends 503 when heap used threshold is passed, as per maxHeapUsedBytes', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxHeapUsedBytes: 40
  })

  var app = new Koa()
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('sends 503 when rss threshold is passed, as per maxRssBytes', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40
  })

  var app = new Koa()
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('sends Client-Retry header as per clientRetrySecs', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    clientRetrySecs: 22
  })

  var app = new Koa()
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        t.is(res.headers['retry-after'], '22')
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('does not set Client-Retry header when clientRetrySecs is 0', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    clientRetrySecs: 0
  })

  var app = new Koa()
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        t.is('retry-after' in res.headers, false)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('errorPropagationMode:false (default)', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: false
  })

  var app = new Koa()
  app.use(protect)
  app.use(function (ctx, next) {
    t.fail()
    return next()
  })

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('errorPropagationMode:true', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: true
  })

  var app = new Koa()
  app.on('error', function () {}) // silence error log output
  app.use(function (ctx, next) {
    return next().catch(function (err) {
      t.ok(err)
      t.is(err.status, 503)
      throw err
    })
  })

  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('in default mode, production:false leads to high detail client response message', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    production: false,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: false
  })

  var app = new Koa()
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        res.once('data', function (msg) {
          msg = msg.toString()
          t.is(msg, 'Server experiencing heavy load: (rss)')
          server.close()
          protect.stop()
          process.memoryUsage = memoryUsage
          t.end()
        })
      }).end()
    }, 6)
  })
})

test('in default mode, production:true leads to standard 503 client response message', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    production: true,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: false
  })

  var app = new Koa()
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        res.once('data', function (msg) {
          msg = msg.toString()
          t.is(msg, 'Service Unavailable')
          server.close()
          protect.stop()
          process.memoryUsage = memoryUsage
          t.end()
        })
      }).end()
    }, 6)
  })
})

test('in errorPropagationMode production:false sets expose:true on error object', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    production: false,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: true
  })

  var app = new Koa()
  app.on('error', function () {}) // silence error log output
  app.use(function (ctx, next) {
    return next().catch(function (err) {
      t.ok(err)
      t.is(err.expose, true)
      throw err
    })
  })

  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('in errorPropagationMode production:true sets expose:false on error object', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    production: true,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: true
  })

  var app = new Koa()
  app.on('error', function () {}) // silence error log output
  app.use(function (ctx, next) {
    return next().catch(function (err) {
      t.ok(err)
      t.is(err.expose, false)
      throw err
    })
  })
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('resumes usual operation once load pressure is reduced under threshold', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40
  })

  var app = new Koa()
  var router = new Router()
  app.use(protect)
  router.get('/', function (ctx, next) {
    ctx.body = 'content'
    return next()
  })

  app.use(router.routes())

  var server = app.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        process.memoryUsage = function () {
          return {
            rss: 10,
            heapTotal: 9999,
            heapUsed: 999,
            external: 99
          }
        }
        setTimeout(function () {
          http.get('http://localhost:3000').on('response', function (res) {
            t.is(res.statusCode, 200)
            server.close()
            protect.stop()
            process.memoryUsage = memoryUsage
            t.end()
          })
        }, 6)
      }).end()
    }, 6)
  })
})

test('if logging option is a string, when overloaded, writes log message using req.log as per level in string', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    logging: 'warn'
  })

  var app = new Koa()
  app.use(function (ctx, next) {
    ctx.log = ctx.req.log = {
      warn: function (msg) {
        t.is(msg, 'Server experiencing heavy load: (rss)')
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }
    }
    return next()
  })
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      http.get('http://localhost:3000').end()
    }, 6)
  })
})

test('if logging option is a function, when overloaded calls the function with heavy load message', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('koa', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    logging: function (msg) {
      t.is(msg, 'Server experiencing heavy load: (rss)')
      server.close()
      protect.stop()
      process.memoryUsage = memoryUsage
      t.end()
    }
  })

  var app = new Koa()
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      http.get('http://localhost:3000').end()
    }, 6)
  })
})

test('if logStatsOnReq is true and if logging option is a string, writes log message using req.log as per level in string for every request', function (t) {
  var protect = protection('koa', {
    logging: 'info',
    logStatsOnReq: true
  })
  t.plan(1)
  var app = new Koa()
  app.use(function (ctx, next) {
    ctx.log = ctx.req.log = {
      info: function (msg) {
        t.same(Object.keys(msg), [
          'overload',
          'eventLoopOverload',
          'heapUsedOverload',
          'rssOverload',
          'eventLoopDelay',
          'maxEventLoopDelay',
          'maxHeapUsedBytes',
          'maxRssBytes'
        ])
        server.close()
        protect.stop()
        t.end()
      }
    }
    return next()
  })
  app.use(protect)

  var server = app.listen(3000, function () {
    setTimeout(function () {
      http.get('http://localhost:3000').end()
    }, 6)
  })
})

test('if logStatsOnReq is true and logging option is a function, calls the function with stats on every request', function (t) {
  var protect = protection('koa', {
    logStatsOnReq: true,
    logging: function (msg) {
      t.same(Object.keys(msg), [
        'overload',
        'eventLoopOverload',
        'heapUsedOverload',
        'rssOverload',
        'eventLoopDelay',
        'maxEventLoopDelay',
        'maxHeapUsedBytes',
        'maxRssBytes'
      ])
      server.close()
      protect.stop()
      t.end()
    }
  })

  var app = new Koa()
  app.use(protect)

  var server = app.listen(3001, function () {
    setTimeout(function () {
      http.get('http://localhost:3001').end()
    }, 6)
  })
})
