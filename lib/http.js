'use strict'

var explain = require('./explain')

Error.stackTraceLimit = Infinity

module.exports = http

function http (opts, protect) {
  return overloadProtection

  function overloadProtection (req, res, next) {
    if (protect.overload === true) {
      res.statusCode = 503
      if (opts.clientRetrySecs) {
        res.setHeader('Retry-After', opts.clientRetrySecs)
      }
      if (opts.errorPropagationMode && typeof next === 'function') {
        var err = Error(explain(protect))
        err.expose = !opts.production
        err.statusCode = 503
        next(err)
        return
      }

      res.end(
       opts.production
        ? 'Service Unavailable'
        : explain(protect)
      )

      if (arguments.length < 3) return true
      else return
    }
    if (arguments.length >= 3 && typeof next === 'function') next()
    else return false
  }
}
