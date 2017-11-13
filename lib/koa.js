'use strict'
module.exports = koa

var explain = require('./explain')

function koa (opts, protect) {
  return overloadProtection

  function overloadProtection (ctx, next) {
    if (protect.overload === true) {
      if (opts.clientRetrySecs) ctx.set('Retry-After', opts.clientRetrySecs)
      if (opts.errorPropagationMode) {
        var err = Error(explain(protect))
        err.status = 503
        err.expose = !opts.production

        // if exposing to client in dev,
        // we also want to output
        // the error in console
        if (err.expose) {
          ctx.app.emit('error', Error(explain(protect)), ctx)
        }

        throw err
      }
      ctx.status = 503

      ctx.res.end(opts.production
        ? 'Service Unavailable'
        : explain(protect)
      )
      return
    }
    return next()
  }
}
