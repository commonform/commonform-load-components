replace components with the right Common Forms

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

Automatically resolve `upgrade: 'yes'` components to the latest compatible edition:

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

You can provide precalculated resolutions for `upgrade: 'yes'` components:

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

The `caches` options permit caching of queries, such as for forms:

```javascript
// A simple in-memory cache. Keys are digest. Values are forms.
var formsCache = {}

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
    caches: {
      forms: {
        get: function (repository, digest, callback) {
          var cached = formsCache[digest]
          if (cached) callback(null, cached)
          else callback(null, false)
        },
        put: function (repository, digest, form, callback) {
          formsCache[digest] = form
          callback()
        }
      }
      /*
      publications: {
        get: function (
          repository,
          publisher,
          project,
          edition,
          callback
        )
        put: function (
          repository,
          publisher,
          project,
          edition,
          publication,
          callback
        )
      }
      */
      /*
      editions: {
        get: function (
          repository,
          publisher,
          project,
          callback
        )
        put: function (
          repository,
          publisher,
          project,
          edition,
          editions,
          callback
        )
      }
      */
    }
  },
  function (error, upgradedForm) {
    assert.ifError(error)
  }
)
```

The `repositories` option array limits repositories to a given whitelist:

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
  {repositories: ['api.different.org']},
  function (error) {
    assert(error)
    assert.equal(
      error.message, 'unauthorized repository: api.commonform.org'
    )
    assert.equal(error.repository, 'api.commonform.org')
  }
)
```

The function will yield an error when a component tries to incorporate itself:

```javascript
var cyclical = {
  repository: 'api.commonform.org',
  publisher: 'kemitchell',
  project: 'cyclical',
  edition: '1e',
  substitutions: {terms: {}, headings: {}}
}

var cyclicalDigest = new Array(65).join('a')

loadComponents(
  {content: [cyclical]},
  {
    caches: {
      forms: {
        get: function (repository, digest, callback) {
          if (digest === cyclicalDigest) {
            callback(null, {content: [cyclical]})
          } else {
            callback(null, false)
          }
        }
      },
      publications: {
        get: function (
          repository, publisher, project, edition, callback
        ) {
          if (
            repository === cyclical.repository &&
            publisher === cyclical.publisher &&
            project === cyclical.project &&
            edition === cyclical.edition
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
