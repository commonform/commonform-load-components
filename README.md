replace components with the right Common Forms

```javascript
var assert = require('assert')
var loadComponents = require('commonform-load-components')

// The URL of the component we'll be using.
var toyDisclaimerURL = 'https://example.com/toy-disclaimer'
// The version we'll be referencing.
var version = '1.0.0'

// The component form we'll be incorporating by reference.
var toyDisclaimerForm = {
  content: [
    'Except under ', { reference: 'Warranties' },
    ', the ', { use: 'Seller' },
    ' disclaims all liability to the ', { use: 'Buyer' },
    ' related to the ', { use: 'Product' }, '.'
  ]
}

// A reference to the component, as it might appear in a Common Form.
var toyDisclaimerReference = {
  component: toyDisclaimerURL,
  version,
  substitutions: {
    terms: {
      Seller: 'Vendor',
      Buyer: 'Customer',
      Product: 'Software'
    },
    headings: {
      Warranties: 'Quality Assurance'
    }
  }
}

// The component form with all terms and headings substitutions applied.
var toyDisclaimerSubstituted = {
  content: [
    'Except under ', { reference: 'Quality Assurance' /* was Warranties */},
    ', the ', { use: 'Vendor' /* was Seller */},
    ' disclaims all liability to the ', { use: 'Customer' /* was Buyer */},
    ' related to the ', { use: 'Software' /* was Product */}, '.'
  ]
}

// The component record that would be stored on example.com.
var toyDisclaimerComponent = {
  publisher: 'Example Publisher',
  name: 'Legal Action Definition',
  version,
  form: toyDisclaimerForm
}

var cache

loadComponents(
  { content: [toyDisclaimerReference] },
  // The cache option permits caching of queries:
  {
    cache: (function() {
      var componentsCache = {}
      componentsCache[toyDisclaimerURL + '/' + version + '.json'] = toyDisclaimerComponent
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
  function (error, loaded) {
    assert.ifError(error)
    assert.deepStrictEqual(
      loaded,
      { content: [{ form: toyDisclaimerSubstituted }] }
    )
  }
)
```

The `markLoaded` option will add metadata to loaded forms:

```javascript
loadComponents(
  { content: [ toyDisclaimerReference ] },
  { markLoaded: true, cache },
  function (error, loaded) {
    assert.ifError(error)
    assert.deepStrictEqual(
      loaded,
      {
        content: [
          {
            form: toyDisclaimerSubstituted,
            reference: toyDisclaimerReference,
            component: toyDisclaimerComponent
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
