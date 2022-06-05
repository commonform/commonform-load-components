load snippets in Common Forms

```javascript
var assert = require('assert')
var loadComponents = require('commonform-load-components')
```

The `cache` option allows you to use a cache for snippet queries:

```javascript
// A simple in-memory cache.
var formsCache = {}

var legalClaim = 'https://commonform.org/kemitchell/legal-claim/1.0.0' 

loadComponents(
  { content: [ { snippet: legalClaim } ] },
  {
    cache: {
      get: function (url, callback) {
        if (url === legalClaim) {
          callback(null, {
            form: {
              content: [
                { definition: 'Legal Claim' },
                ' means any legal action or claim, ignoring the historical distinction between "in law" and "in equity".'
              ]
            }
          })
        } else {
          callback(null, false)
        }
      }
    }
  },
  function (error, form) {
    assert.ifError(error)
    assert.equal(typeof form, 'object')
  }
)
```

The function will yield an error when a component tries to incorporate itself:

```javascript
var cyclical = { snippet: 'https://commonform.org/kemitchell/cyclical/1.0.0' }

loadComponents(
  { content: [cyclical] },
  {
    caches: {
      get: function (url, callback) {
        callback(null, { content: [cyclical] })
      }
    }
  },
  function (error) {
    assert.equal(error.message, 'cycle')
    assert(typeof error.digest === 'string')
  }
)
```
