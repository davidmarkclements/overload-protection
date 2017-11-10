'use strict'

var explain = require('./explain')

Error.stackTraceLimit = Infinity

module.exports = http 

function http (opts, protect) {

  return overloadProtection

  function overloadProtection (req, res, next) {
    var explanation 
    if (protect.overload === true) {
      res.statusCode = 503
      res.setHeader('Retry-After', opts.clientRetrySecs)
      if (opts.production || opts.errorPropagationMode) {
        explanation = explain(protect)
      }
      if (opts.errorPropagationMode && typeof next === 'function') {
        var err = Error(explanation)
        err.expose = opts.production
        err.statusCode = 503
        next(err)
        return
      }

      res.end(
       opts.production
        ? 'Service Unavailable'
        : explanation
      )
      if (arguments.length < 3) return true
    }
    if (typeof next === 'function') next()
    else if (arguments.length < 3) return false
  }

}
