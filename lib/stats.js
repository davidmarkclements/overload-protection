function OverloadProtectionStats (overload, eventLoopOverload, heapUsedOverload, rssOverload, eventLoopDelay, maxEventLoopDelay, maxHeapUsedBytes, maxRssBytes) {
  this.overload = overload
  this.eventLoopOverload = eventLoopOverload
  this.heapUsedOverload = heapUsedOverload
  this.rssOverload = rssOverload
  this.eventLoopDelay = eventLoopDelay
  this.maxEventLoopDelay = maxEventLoopDelay
  this.maxHeapUsedBytes = maxHeapUsedBytes
  this.maxRssBytes = maxRssBytes
}

module.exports = OverloadProtectionStats
