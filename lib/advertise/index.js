var async = require('async')
var adverts = require('../adverts')
var parseOptions = require('./parse-options')
var broadcastAdvert = require('./broadcast-advert')
var stopAdvert = require('./stop-advert')
var createLocation = require('./create-location')
var notify = require('../commands/notify')
var callbackOrEmit = require('../callback-or-emit')

module.exports = function advertise (ssdp, advert, callback) {
  callback = callbackOrEmit(ssdp, callback)
  advert = parseOptions(advert)

  async.series([
    createLocation.bind(null, ssdp, advert),
    // send ssdp:byebye then ssdp:alive
    // see: https://msdn.microsoft.com/en-us/library/cc247331.aspx
    broadcastAdvert.bind(null, ssdp, advert, notify.BYEBYE),
    broadcastAdvert.bind(null, ssdp, advert, notify.ALIVE)
  ], function (error) {
    var plumbing = {}

    var broadcast = function () {
      plumbing.timeout = setTimeout(function () {
        broadcastAdvert(ssdp, advert, notify.ALIVE, function (error) {
          if (error) {
            ssdp.emit('error', error)
          }

          broadcast()
        })
      }, advert.interval)
    }
    broadcast()

    plumbing.shutDownServers = advert.shutDownServers
    delete advert.shutDownServers

    var ad = {
      service: advert,
      stop: stopAdvert.bind(null, ssdp, plumbing, advert)
    }

    adverts.push(ad)

    callback(error, ad)
  })
}