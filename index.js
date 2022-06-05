var concat = require('simple-concat')
var has = require('has')
var hash = require('commonform-hash')
var https = require('https')
var isObject = require('is-object')
var once = require('once')
var parse = require('json-parse-errback')
var predicate = require('commonform-predicate')
var runParallelLimit = require('run-parallel-limit')
var substitute = require('commonform-substitute')

var DEFAULT_PARALLEL_LIMIT = 1

module.exports = function recurse (form, options, callback) {
  // Internal Recursive State
  options.loaded = options.loaded || []
  options.path = options.path || []
  options.hostnames = options.hostnames || []
  var cache = options.cache = options.cache || {}
  options.markLoaded = options.markLoaded || false

  runParallelLimit(
    form.content.map(function (element, index) {
      return function (done) {
        // TODO: if (predicate.component(element)) {
        if (has(element, 'component')) {
          // Check the hostname against any provided whitelist.
          var base = element.component
          if (options.hostnames.length !== 0) {
            var parsed = new URL(base)
            var hostname = parsed.hostname
            if (!options.hostnames.includes(hostname)) {
              var error = new Error('unauthorized hostname: ' + hostname)
              error.hostname = hostname
              return done(error)
            }
          }
          // Get the component from cache or the Web.
          var url = element.component
          if (!element.component.endsWith('/')) url += '/'
          url += encodeURIComponent(element.version) + '.json'
          if (cache.get) {
            cache.get(url, function (error, form) {
              if (error || !form) downloadAndCache()
              else withForm(null, form)
            })
          } else downloadAndCache()
        } else if (predicate.child(element)) {
          var newOptions = Object.assign({}, options, {
            path: options.path.concat('content', index, 'form')
          })
          recurse(element.form, newOptions, function (error, form) {
            if (error) return done(error)
            var child = { form: form }
            if (has(element, 'heading')) child.heading = element.heading
            done(null, child)
          })
        } else {
          done(null, element)
        }

        function downloadAndCache () {
          downloadForm(url, function (error, form) {
            if (error) return withForm(error)
            if (!form) return withForm(error, false)
            if (cache.put) {
              cache.put(url, form, function () {
                finish()
              })
            } else {
              finish()
            }
            function finish (error) {
              withForm(error, form)
            }
          })
        }

        function withForm (error, form) {
          if (error) return done(error)
          if (!form) {
            return done(
              new Error('Missing Form: ' + base + ' version ' + element.version)
            )
          }
          var digest = hash(form)
          if (options.loaded.includes(digest)) {
            var cycleError = new Error('cycle')
            cycleError.digest = digest
            return done(cycleError)
          }
          var newOptions = Object.assign({}, options, {
            loaded: options.loaded.concat(digest),
            path: options.path.concat('content', index, 'form')
          })
          recurse(form, newOptions, function (error, form) {
            if (error) return done(error)
            var result = { form: substitute(form, element.substitutions) }
            if (element.heading) result.heading = element.heading
            if (options.markLoaded) {
              result.loaded = true
              result.component = element
            }
            done(null, result)
          })
        }
      }
    }),
    options.limit || DEFAULT_PARALLEL_LIMIT,
    function (error, results) {
      // The callback should only be called here.
      if (error) return callback(error)
      form.content = results
      callback(null, form, options._resolved)
    }
  )
}

function downloadForm (url, callback) {
  callback = once(callback)
  https.request(url)
    .once('error', callback)
    .once('timeout', callback)
    .once('response', function (response) {
      var statusCode = response.statusCode
      if (statusCode === 404) return callback(null, false)
      if (statusCode !== 200) {
        var statusError = new Error()
        statusError.statusCode = statusCode
        return callback(statusError)
      }
      concat(response, function (error, buffer) {
        if (error) return callback(error)
        parse(buffer, function (error, parsed) {
          if (error) return callback(error)
          if (!isObject(parsed) || !isObject(parsed.form)) {
            return callback(null, false)
          }
          callback(null, parsed.form)
        })
      })
    })
    .end()
}
