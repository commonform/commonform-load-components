```javascript
var assert = require('assert')
var loadComponents = require('commonform-load-components')

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
