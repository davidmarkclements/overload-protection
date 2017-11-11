'use strict'
module.exports = koa

var explain = require('./explain')

function koa (opts, protect) {
  return overloadProtection

  function overloadProtection (ctx, next) {
    var explanation
    if (protect.overload === true) {
      if (opts.clientRetrySecs) ctx.set('Retry-After', opts.clientRetrySecs)
      if (opts.production || opts.errorPropagationMode) {
        explanation = explain(protect)
      }
      if (opts.errorPropagationMode) {
        var err = Error(explanation)
        err.status = 503
        err.expose = !opts.production

        // if exposing to client in dev,
        // we also want to output
        // the error in console
        if (err.expose) {
          ctx.app.emit('error', Error(explanation), ctx)
        }

        throw err
      }
      ctx.status = 503
      ctx.res.end(opts.production
        ? 'Service Unavailable'
        : explanation
      )
      return
    }
    return next()
  }
}
