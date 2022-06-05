replace components with the right Common Forms

```javascript
var assert = require('assert')
var loadComponents = require('commonform-load-components')
```

Replace a component with a child form:

```javascript
var legalActionURL = 'https://example.com/legal-action'

var legalActionReference = {
  component: legalActionURL,
  version: '1.0.0',
  substitutions: { terms: {}, headings: {} }
}

var legalActionForm = {
  content: [
    { definition: 'Legal Claim' },
    ' means any legal action or claim, ignoring the historical distinction between "in law" and "in equity".'
  ]
}

var legalActionComponent = {
  publisher: 'Example Publisher',
  name: 'Legal Action Definition',
  version: '1.0.0',
  form: legalActionForm
}

var cache

loadComponents(
  { content: [legalActionReference] },
  // The cache option permits caching of queries:
  {
    cache: (function() {
      var componentsCache = {}
      componentsCache[legalActionURL + '/1.0.0.json'] = legalActionComponent
      cache = {
        get: function (url, callback) {
          callback(null, componentsCache[url] || false)
        },
        put: function (url, component, callback) {
          componentsCache[url] = component
          callback()
        }
      }
      return cache
    })()
  },
  function (error) {
    assert.ifError(error)
  }
)
```

The `markLoaded` option will add metadata to loaded forms:

```javascript
loadComponents(
  { content: [ legalActionReference ] },
  { markLoaded: true, cache },
  function (error, loaded) {
    assert.ifError(error)
    assert.deepStrictEqual(
      loaded,
      {
        content: [
          {
            form: legalActionForm,
            reference: legalActionReference,
            component: legalActionComponent
          }
        ]
      }
    )
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
          callback(null, {
            publisher: 'Example',
            name: 'Cyclical Component',
            version: '1.0.0',
            form: { content: [cyclical] }
          })
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
