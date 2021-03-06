var getEditions = require('commonform-get-editions')
var getForm = require('commonform-get-form')
var hash = require('commonform-hash')
var revedCompare = require('reviewers-edition-compare')
var revedUpgrade = require('reviewers-edition-upgrade')
var runParallelLimit = require('run-parallel-limit')
var samePath = require('commonform-same-path')
var substitute = require('commonform-substitute')
var xtend = require('xtend')

var DEFAULT_PARALLEL_LIMIT = 1

module.exports = function load (form, options, callback) {
  // Internal Recursive State
  options.original = options.original || false
  options.resolutions = options.resolutions || []
  options.loaded = options.loaded || []
  options.path = options.path || []
  options.repositories = options.repositories || []
  options._resolved = options._resolved || []

  // Request Caching
  var caches = options.caches || {}
  caches.forms = caches.forms || {}
  caches.editions = caches.editions || {}
  var loadEditions = cachedLoader(caches.editions, getEditions)
  var loadForm = cachedLoader(caches.forms, getForm)

  runParallelLimit(
    form.content.map(function (element, index) {
      return function (done) {
        if (has(element, 'repository')) {
          // Check the repository against any provided whitelist.
          var repository = element.repository
          if (
            options.repositories.length !== 0 &&
            options.repositories.indexOf(repository) === -1
          ) {
            var error = new Error('unauthorized repository: ' + repository)
            error.repository = repository
            return done(error)
          }
          var path = options.path.concat('content', index)
          if (element.upgrade && !options.original) {
            // Check for a provided resolution.
            var resolution = options.resolutions.find(function (resolution) {
              return samePath(path, resolution.path)
            })
            if (resolution) return withEdition(resolution.edition)
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
                options._resolved.push({
                  path: path,
                  repository: element.repository,
                  publisher: element.publisher,
                  project: element.project,
                  upgrade: true,
                  specified: element.edition,
                  edition: resolved
                })
                withEdition(resolved)
              }
            )
          } else {
            options._resolved.push({
              path: path,
              repository: element.repository,
              publisher: element.publisher,
              project: element.project,
              upgrade: element.upgrade === 'yes',
              edition: element.edition
            })
            withEdition(element.edition)
          }
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

        function withEdition (edition) {
          getPublicationFormAsChild(
            element,
            path,
            element.repository,
            element.publisher,
            element.project,
            edition,
            done
          )
        }
      }
    }),
    options.limit || DEFAULT_PARALLEL_LIMIT,
    function (error, results) {
      if (error) return callback(error)
      form.content = results
      callback(null, form, options._resolved)
    }
  )

  function getPublicationFormAsChild (
    element, path,
    repository, publisher, project, edition,
    callback
  ) {
    loadForm(
      repository, publisher, project, edition,
      function (error, form) {
        if (error) return callback(error)
        if (!form) {
          return callback(
            new Error('Missing Form: ' + repository + publisher + '/' + project + '/' + edition)
          )
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
          var result = { form: substitute(form, element.substitutions) }
          if (element.heading) result.heading = element.heading
          callback(null, result)
        })
      }
    )
  }

  function cachedLoader (cache, get) {
    // Number of non-callback arguments `get` takes:
    var arity = get.length - 1
    return function (/* arguments */) {
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

function has (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}
