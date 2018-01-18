```javascript
var assert = require('assert')
var loadComponents = require('commonform-load-components')
```

Replace a component with a child form:

```javascript
loadComponents(
  {
    content: [
      {
        repository: 'api.commonform.org',
        publisher: 'kemitchell',
        project: 'exchange-act',
        edition: '1e',
        upgrade: 'yes',
        substitutions: {terms: {}, headings: {}}
      }
    ]
  },
  {},
  function (error, form) {
    assert.ifError(error)
    assert.deepStrictEqual(form, {
      content: [
        {
          form: {
            content: [
              {definition: 'Exchange Act'},
              ' means the Securities Exchange Act of 1934.'
            ]
          }
        }
      ]
    })
  }
)
```

Automatically resolve `upgrade: true` components to the latest compatible edition:

```javascript
loadComponents(
  {
    content: [
      {
        repository: 'api.commonform.org',
        publisher: 'kemitchell',
        project: 'legal-action',
        // Use 1e, but upgrade if possible.
        edition: '1e',
        upgrade: 'yes',
        substitutions: {terms: {}, headings: {}}
      }
    ]
  },
  {limit: 1},
  function (error, upgradedForm) {
    assert.ifError(error)
    loadComponents(
      {
        content: [
          {
            repository: 'api.commonform.org',
            publisher: 'kemitchell',
            project: 'legal-action',
            // Use 1e1c specifically.
            edition: '1e1c',
            substitutions: {terms: {}, headings: {}}
          }
        ]
      },
      {limit: 1},
      function (error, fixedForm) {
        assert.ifError(error)
        assert.deepStrictEqual(
          upgradedForm, fixedForm
        )
      }
    )
  }
)
```

You can provide precalculated resolutions for `upgrade: true` components:

```javascript
loadComponents(
  {
    content: [
      {
        repository: 'api.commonform.org',
        publisher: 'kemitchell',
        project: 'legal-action',
        edition: '1e',
        upgrade: 'yes',
        substitutions: {terms: {}, headings: {}}
      }
    ]
  },
  {
    resolutions: [
      {
        path: ['content', 0],
        edition: '1e'
      }
    ]
  },
  function (error, upgradedForm) {
    assert.ifError(error)
    loadComponents(
      {
        content: [
          {
            repository: 'api.commonform.org',
            publisher: 'kemitchell',
            project: 'legal-action',
            edition: '1e',
            substitutions: {terms: {}, headings: {}}
          }
        ]
      },
      {limit: 1},
      function (error, fixedForm) {
        assert.ifError(error)
        assert.deepStrictEqual(
          upgradedForm, fixedForm
        )
      }
    )
  }
)
```

The function will yield an error when a component tries to incorporate itself:

```javascript
var cyclicalComponent = {
  repository: 'api.commonform.org',
  publisher: 'kemitchell',
  project: 'cyclical',
  edition: '1e',
  substitutions: {terms: {}, headings: {}}
}

var cyclicalDigest = new Array(65).join('a')

loadComponents(
  {content: [cyclicalComponent]},
  {
    caches: {
      forms: {
        get: function (repository, digest, callback) {
          if (digest === cyclicalDigest) {
            callback(null, {content: [cyclicalComponent]})
          } else {
            callback(null, false)
          }
        }
      },
      publications: {
        get: function (repository, publisher, project, edition, callback) {
          if (
            repository === cyclicalComponent.repository &&
            publisher === cyclicalComponent.publisher &&
            project === cyclicalComponent.project &&
            edition === cyclicalComponent.edition
          ) {
            callback(null, {digest: cyclicalDigest})
          } else {
            callback(null, false)
          }
        }
      }
    }
  },
  function (error) {
    assert.equal(error.message, 'cycle')
    assert.equal(error.digest, cyclicalDigest)
  }
)
```
