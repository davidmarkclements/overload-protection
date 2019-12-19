'use strict'
var test = require('tap').test
var protect = require('../')

test('throws if framework is unspecified', function (t) {
  t.throws(function () {
    protect()
  })
  t.end()
})

test('throws if framework is not supported', function (t) {
  t.throws(function () {
    protect('not a thing')
  })
  t.end()
})

test('throws if all thresholds are disabled (set to 0)', function (t) {
  t.throws(function () {
    protect('http', {
      eventLoopDelay: 0,
      maxRssBytes: 0,
      maxHeapUsedBytes: 0
    })
  })
  t.end()
})

test('throws if logStatsOnReq is true but logging is false', function (t) {
  t.throws(function () {
    protect('http', {
      logStatsOnReq: true
    })
  })
  t.end()
})

test('instance.stop ceases sampling', function (t) {
  var sI = global.setInterval
  var cI = global.clearInterval
  var mock = {unref: function () { return mock }}
  global.setInterval = function () { return mock }
  global.clearInterval = function (ref) {
    t.is(ref, mock)
    global.setInterval = sI
    global.clearInterval = cI
    t.end()
  }
  var instance = protect('http')
  instance.stop()
})

test('sampleInterval option sets the sample rate', function (t) {
  var sI = global.setInterval
  var cI = global.clearInterval
  var sampleRate = 88
  var mock = {unref: function () { return mock }}
  global.setInterval = function (fn, n) {
    t.is(n, sampleRate)
    return mock
  }
  global.clearInterval = function (ref) {
    t.is(ref, mock)
    global.setInterval = sI
    global.clearInterval = cI
    t.end()
  }
  var instance = protect('http', {
    sampleInterval: sampleRate
  })
  instance.stop()
})

test('exposes maxEventLoopDelay option on instance', function (t) {
  var value = 9999
  var instance = protect('http', {
    maxEventLoopDelay: value
  })
  t.is(instance.maxEventLoopDelay, value)
  instance.stop()
  t.end()
})

test('exposes maxHeapUsedBytes option on instance', function (t) {
  var value = 9999
  var instance = protect('http', {
    maxHeapUsedBytes: value
  })
  t.is(instance.maxHeapUsedBytes, value)
  instance.stop()
  t.end()
})

test('exposes maxRssBytes option on instance', function (t) {
  var value = 9999
  var instance = protect('http', {
    maxRssBytes: value
  })
  t.is(instance.maxRssBytes, value)
  instance.stop()
  t.end()
})

test('instance.eventLoopDelay indicates the delay between samples', function (t) {
  var delay = 50
  var instance = protect('http')
  var start = Date.now()
  // "sleep" with while blocking is imprecise, particularly in turbofan,
  // throwing in a Buffer.alloc to compensate
  while (Date.now() - start <= delay) { Buffer.alloc(1e9) }
  setImmediate(function () {
    t.is(instance.eventLoopDelay > delay, true)
    instance.stop()
    t.end()
  })
})

test('instance.eventLoopOverload is true when maxEventLoopDelay threshold is breached', function (t) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 10
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  setImmediate(function () {
    t.is(instance.eventLoopOverload, true)
    instance.stop()
    t.end()
  })
})

test('instance.eventLoopOverload is false when returning under maxEventLoopDelay threshold', function (t) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 10
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  setImmediate(function () {
    setTimeout(function () {
      t.is(instance.eventLoopOverload, false)
      instance.stop()
      t.end()
    }, 10)
  })
})

test('instance.eventLoopOverload is always false when maxEventLoopDelay is 0 (maxHeapUsedBytes enabled)', function (t) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxHeapUsedBytes: 10
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  setImmediate(function () {
    t.is(instance.eventLoopOverload, false)
    instance.stop()
    t.end()
  })
})

test('instance.eventLoopOverload is always false when maxEventLoopDelay is 0 (maxRssBytes enabled)', function (t) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 10
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  setImmediate(function () {
    t.is(instance.eventLoopOverload, false)
    instance.stop()
    t.end()
  })
})

test('instance.overload is true if instance.eventLoopOverload is true', function (t) {
  var delay = 50
  var instance = protect('http', {
    sampleInterval: 5,
    maxEventLoopDelay: 1
  })
  var start = Date.now()
  while (Date.now() - start < delay) {}
  setImmediate(function () {
    t.is(instance.eventLoopOverload, true)
    t.is(instance.overload, instance.eventLoopOverload)
    instance.stop()
    t.end()
  })
})

test('instance.heapUsedOverload is true when maxHeapUsedBytes threshold is breached', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 10
  })
  setTimeout(function () {
    t.is(instance.heapUsedOverload, true)
    process.memoryUsage = memoryUsage
    instance.stop()
    t.end()
  }, 6)
})

test('instance.heapUsedOverload is false when returning under maxHeapUsedBytes threshold', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 10
  })
  setTimeout(function () {
    process.memoryUsage = function () {
      return {
        rss: 99999,
        heapTotal: 9999,
        heapUsed: 2,
        external: 99
      }
    }
    setTimeout(function () {
      t.is(instance.heapUsedOverload, false)
      process.memoryUsage = memoryUsage
      instance.stop()
      t.end()
    }, 6)
  }, 6)
})

test('instance.heapUsedOverload is always false when maxHeapUsedBytes is 0', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 0
  })
  setTimeout(function () {
    t.is(instance.heapUsedOverload, false)
    process.memoryUsage = memoryUsage
    instance.stop()
    t.end()
  }, 6)
})

test('instance.overload is true if instance.heapUsedOverload is true', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 10
  })
  setTimeout(function () {
    t.is(instance.heapUsedOverload, true)
    t.is(instance.overload, instance.heapUsedOverload)
    instance.stop()
    process.memoryUsage = memoryUsage
    t.end()
  }, 6)
})

test('instance.rssOverload is true when maxRssBytes threshold is breached', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxRssBytes: 10
  })
  setTimeout(function () {
    t.is(instance.rssOverload, true)
    process.memoryUsage = memoryUsage
    instance.stop()
    t.end()
  }, 6)
})

test('instance.rssOverload is false when returning under maxRssBytes threshold', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxHeapUsedBytes: 10
  })
  setTimeout(function () {
    process.memoryUsage = function () {
      return {
        rss: 2,
        heapTotal: 9999,
        heapUsed: 2,
        external: 99
      }
    }
    setTimeout(function () {
      t.is(instance.rssOverload, false)
      instance.stop()
      process.memoryUsage = memoryUsage
      t.end()
    }, 6)
  }, 6)
})

test('instance.rssOverload is always false when maxRssBytes is 0', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxRssBytes: 0
  })
  setTimeout(function () {
    t.is(instance.rssOverload, false)
    instance.stop()
    process.memoryUsage = memoryUsage
    t.end()
  }, 6)
})

test('instance.overload is true if instance.rssOverload is true', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var instance = protect('http', {
    sampleInterval: 5,
    maxRssBytes: 10
  })
  setTimeout(function () {
    t.is(instance.rssOverload, true)
    t.is(instance.overload, instance.rssOverload)
    instance.stop()
    process.memoryUsage = memoryUsage
    t.end()
  }, 6)
})

if (Object.setPrototypeOf) {
  test('Supports legacy JS (__proto__)', function (t) {
    var setPrototypeOf = Object.setPrototypeOf
    delete Object.setPrototypeOf
    var instance = protect('http')
    // overload wouldn't be in instance if __proto__ wasn't set
    t.is('overload' in instance, true)
    t.end()
    Object.setPrototypeOf = setPrototypeOf
  })
}

if (!Object.setPrototypeOf) {
  test('Supports modern/future JS (Object.setPrototypeOf)', function (t) {
    Object.setPrototypeOf = function (o, proto) {
      o.__proto__ = proto // eslint-disable-line
    }
    var instance = protect('http')
    // overload wouldn't be in instance if __proto__ wasn't set
    t.is('overload' in instance, true)
    t.end()
    delete Object.setPrototypeOf
  })
}
