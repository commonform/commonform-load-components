var concat = require('simple-concat')
var hash = require('commonform-hash')
var https = require('https')
var once = require('once')
var parse = require('json-parse-errback')
var runParallelLimit = require('run-parallel-limit')
var substitute = require('commonform-substitute')
var xtend = require('xtend')

var DEFAULT_PARALLEL_LIMIT = 1

module.exports = function load (form, options, callback) {
  // Internal Recursive State
  options.loaded = options.loaded || []
  options.path = options.path || []

  // Request Caching
  var cache = options.cache || {}

  runParallelLimit(
    form.content.map(function (element, index) {
      return function (done) {
        if (has(element, 'snippet')) {
          var url = element.snippet
          var path = options.path.concat('content', index)
          getForm(url, cache, function (error, snippet) {
            if (error) return callback(error)
            var form = snippet.form
            if (!form) {
              return callback(new Error('Missing Form: ' + url))
            }
            var digest = hash(form)
            if (options.loaded.indexOf(digest) !== -1) {
              var cycleError = new Error('cycle')
              cycleError.digest = digest
              return callback(cycleError)
            }
            var newOptions = xtend(options, {
              loaded: options.loaded.concat(digest),
              path: path.concat('form')
            })
            load(form, newOptions, function (error, form) {
              if (error) return callback(error)
              var substitutions = element.substitutions || {}
              if (!substitutions.terms) substitutions.terms = {}
              if (!substitutions.headings) substitutions.headings = {}
              var result = { form: substitute(form, substitutions) }
              if (element.heading) result.heading = element.heading
              callback(null, result)
            })
          })
        } else if (has(element, 'form')) {
          var newOptions = xtend(options, {
            path: options.path.concat('content', index, 'form')
          })
          load(element.form, newOptions, function (error, form, resolved) {
            if (error) return done(error)
            var child = { form: form }
            if (has(element, 'heading')) child.heading = element.heading
            done(null, child)
          })
        } else {
          done(null, element)
        }
      }
    }),
    options.limit || DEFAULT_PARALLEL_LIMIT,
    function (error, results) {
      if (error) return callback(error)
      form.content = results
      callback(null, form)
    }
  )
}

function getForm (url, cache, callback) {
  if (cache.get) {
    cache.get(url, function (error, snippet) {
      if (error || snippet === false) {
        downloadForm(url, finish)
      } else {
        finish(null, snippet)
      }
    })
  } else {
    downloadForm(url, finish)
  }

  function finish (error, snippet) {
    if (error) return callback(error)
    if (snippet === false) return callback(null, false)
    if (cache.put) {
      cache.put(url, snippet, function () {
        callback(null, snippet)
      })
    } else {
      callback(null, snippet)
    }
  }
}

function downloadForm (url, callback) {
  callback = once(callback)
  https.request(url + '.json')
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
          callback(null, parsed)
        })
      })
    })
    .end()
}

function has (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}
