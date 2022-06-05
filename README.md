replace components with the right Common Forms

```javascript
var assert = require('assert')
var loadComponents = require('commonform-load-components')
```

Replace a component with a child form:

```javascript
The `cache` option permits caching of queries:

```javascript
// A simple in-memory cache. Keys are digest. Values are forms.
var formsCache = {}
var legalActionURL = 'https://example.com/legal-action'
formsCache[legalActionURL + '/1.0.0.json'] = {
  content: [
    { definition: 'Legal Claim' },
    ' means any legal action or claim, ignoring the historical distinction between "in law" and "in equity".'
  ]
}

loadComponents(
  {
    content: [
      {
        component: legalActionURL,
        version: '1.0.0',
        substitutions: { terms: {}, headings: {} }
      }
    ]
  },
  {
    cache: {
      get: function (url, callback) {
        callback(null, formsCache[url] || false)
      },
      put: function (url, form, callback) {
        formsCache[url] = form
        callback()
      }
    }
  },
  function (error) {
    assert.ifError(error)
  }
)
```

The `hostnames` option array limits components to those from the given array:

```javascript
loadComponents(
  {
    content: [
      {
        component: 'https://example.com/component',
        version: '1.0.0',
        substitutions: { terms: {}, headings: {} }
      }
    ]
  },
  { hostnames: ['other.org'] },
  function (error) {
    assert(error)
    assert.equal(
      error.message, 'unauthorized hostname: example.com'
    )
    assert.equal(error.hostname, 'example.com')
  }
)
```

The function will yield an error when a component tries to incorporate itself:

```javascript
var cyclicalURL = 'https://example.com/cyclical'
var cyclical = {
  component: cyclicalURL,
  version: '1.0.0',
  substitutions: { terms: {}, headings: {} }
}

loadComponents(
  { content: [cyclical] },
  {
    cache: {
      get: function (url, callback) {
        if (url === cyclicalURL + '/1.0.0.json') {
          callback(null, { content: [cyclical] })
        } else {
          callback(null, false)
        }
      }
    }
  },
  function (error) {
    assert.equal(error.message, 'cycle')
    assert(typeof error.digest === 'string')
  }
)
```
