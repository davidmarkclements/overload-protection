'use strict'

module.exports = explain

function explain (protect) {
  var explanation = 'Server experiencing heavy load: ('
  var c = 0
  if (protect.eventLoopOverload === true) {
    c += 1
    explanation += 'event loop'
  }
  if (protect.heapUsedOverload === true) {
    explanation += c > 0 ? ', heap' : 'heap'
    c += 1
  }
  if (protect.rssOverload === true) {
    explanation += c > 0 ? ', rss' : 'rss'
  }

  explanation += ')'

  return explanation
}
