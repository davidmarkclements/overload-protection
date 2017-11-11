'use strict'

module.exports = explain

function explain (protect) {
  var explanation = 'Server experiencing heavy load: ('
  explanation += [
    ['eventLoopOverload', 'event loop'],
    ['heapOverload', 'heap'],
    ['rssOverload', 'rss']
  ].filter(function (tuple) { return protect[tuple[0]] })
  .map(function (tuple) { return tuple[1] })
  .join(', ')

  explanation += ')'

  return explanation
}
