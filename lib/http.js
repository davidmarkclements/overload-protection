'use strict'

var explain = require('./explain')

Error.stackTraceLimit = Infinity

module.exports = http

function http (opts, protect) {
  var clientRetrySecs = opts.clientRetrySecs
  var sendRetryHeader = clientRetrySecs > 0
  var logging = opts.logging
  var loggingOn = typeof logging === 'string' || typeof logging === 'function'
  var log4jLogging = typeof logging === 'string'
  var errorPropagationMode = opts.errorPropagationMode
  var production = opts.production
  var expose = !production

  return overloadProtection

  function overloadProtection (req, res, next) {
    if (protect.overload === true) {
      res.statusCode = 503
      if (sendRetryHeader) res.setHeader('Retry-After', clientRetrySecs)
      if (loggingOn) {
        if (log4jLogging) req.log[logging](explain(protect))
        else logging(explain(protect))
      }
      if (errorPropagationMode && typeof next === 'function') {
        var err = Error(explain(protect))
        err.expose = expose
        err.statusCode = 503
        next(err)
        return
      }

      res.end(production ? 'Service Unavailable' : explain(protect))

      if (arguments.length < 3) return true
      else return
    }
    if (arguments.length >= 3 && typeof next === 'function') next()
    else return false
  }
}
