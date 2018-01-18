/*
Copyright 2018 Kyle E. Mitchell

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var getForm = require('commonform-get-form')
var getPublication = require('commonform-get-publication')
var https = require('https')
var parse = require('json-parse-errback')
var revedCompare = require('reviewers-edition-compare')
var revedUpgrade = require('reviewers-edition-upgrade')
var runParallelLimit = require('run-parallel-limit')
var substitute = require('commonform-substitute')
var xtend = require('xtend')

module.exports = function load (form, options, callback) {
  options.loaded = options.loaded || []
  // Request Caching
  var caches = options.caches || {}
  caches.forms = caches.forms || {}
  caches.publications = caches.publications || {}
  caches.editions = caches.editions || {}
  var loadEditions = cachedLoader(caches.publications, getEditions)
  var loadPublication = cachedLoader(caches.publications, getPublication)
  var loadForm = cachedLoader(caches.forms, getForm)

  runParallelLimit(
    form.content.map(function (element) {
      return function (done) {
        if (element.hasOwnProperty('repository')) {
          if (element.upgrade) {
            // Fetch a list of available editions of the project.
            loadEditions(
              element.repository,
              element.publisher,
              element.project,
              function (error, editions) {
                if (error) return done(error)
                if (editions === false) return callback(couldNotLoad(element))
                // Find editions we can upgrade to.
                var matchingEditions = editions
                  .filter(function (availableEdition) {
                    return (
                      availableEdition === element.edition ||
                      revedUpgrade(element.edition, availableEdition)
                    )
                  })
                if (matchingEditions.length === 0) {
                  return callback(couldNotLoad(element))
                }
                // Find the latest edition we can upgrade to.
                var resolved = matchingEditions
                  .sort(revedCompare)
                  .reverse()[0]
                // Load that form.
                getPublicationFormAsChild(
                  element,
                  element.repository,
                  element.publisher,
                  element.project,
                  resolved,
                  done
                )
              }
            )
          } else {
            getPublicationFormAsChild(
              element,
              element.repository,
              element.publisher,
              element.project,
              element.edition,
              done
            )
          }
        } else {
          done(null, element)
        }
      }
    }),
    options.limit || 5,
    function (error, results) {
      if (error) return callback(error)
      form.content = results
      callback(null, form)
    }
  )

  function getPublicationFormAsChild (
    element,
    repository, publisher, project, edition,
    callback
  ) {
    loadPublication(
      repository, publisher, project, edition,
      function (error, publication) {
        if (error) return callback(error)
        if (publication === false) return callback(couldNotLoad(element))
        var digest = publication.digest
        if (options.loaded.indexOf(digest) !== -1) {
          var cycleError = new Error('cycle')
          cycleError.digest = digest
          return callback(cycleError)
        }
        loadForm(repository, digest, function (error, form) {
          if (error) return callback(error)
          var newOptions = xtend(options, {
            loaded: options.loaded.concat(digest)
          })
          load(form, newOptions, function (error, form) {
            if (error) return callback(error)
            var result = {form: substitute(form, element.substitutions)}
            if (element.heading) result.heading = element.heading
            callback(null, result)
          })
        })
      }
    )
  }

  function cachedLoader (cache, get) {
    // Number of non-callback arguments `get` takes:
    var arity = get.length - 1
    return function (/* ... */) {
      var args = Array.prototype.slice.call(arguments)
      var query = args.slice(0, arity)
      var callback = args[arity]
      if (cache.get) {
        cache.get.apply(cache, query.concat(function (error, data) {
          if (error || data === false) {
            get.apply(null, query.concat(finish))
          } else {
            finish(null, data)
          }
        }))
      } else {
        get.apply(null, query.concat(finish))
      }

      function finish (error, data) {
        if (error) return callback(error)
        if (data === false) return callback(null, false)
        if (cache.put) {
          cache.put.apply(cache, query.concat(data).concat(function () {
            callback(null, data)
          }))
        } else {
          callback(null, data)
        }
      }
    }
  }
}

function couldNotLoad (element) {
  var returned = new Error('could not load component')
  returned.component = element
  return returned
}

function getEditions (host, publisher, project, callback) {
  https.request({
    host: host,
    path: (
      '/publishers/' + publisher +
      '/projects/' + project +
      '/publications'
    )
  })
    .once('response', function (response) {
      var statusCode = response.statusCode
      if (statusCode === 404) {
        callback(null, false)
      } else if (statusCode !== 200) {
        var error = new Error()
        error.statusCode = statusCode
        callback(error)
      } else {
        var chunks = []
        response
          .on('data', function (chunk) {
            chunks.push(chunk)
          })
          .once('error', function (error) {
            callback(error)
          })
          .once('end', function () {
            parse(Buffer.concat(chunks), callback)
          })
      }
    })
    .end()
}
