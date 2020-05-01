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
        heading: 'Contains Component',
        form: {
          content: [
            {
              repository: 'commonform.org',
              publisher: 'kemitchell',
              project: 'exchange-act',
              edition: '1e',
              upgrade: 'yes',
              substitutions: { terms: {}, headings: {} }
            }
          ]
        }
      }
    ]
  },
  {},
  function (error, form) {
    assert.ifError(error)
    assert.deepStrictEqual(form, {
      content: [
        {
          heading: 'Contains Component',
          form: {
            content: [
              {
                form: {
                  content: [
                    { definition: 'Exchange Act' },
                    ' means the Securities Exchange Act of 1934.'
                  ]
                }
              }
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
        repository: 'commonform.org',
        publisher: 'test',
        project: 'component-with-headings',
        edition: '1e',
        substitutions: { terms: {}, headings: {} }
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
              {
                heading: 'First Heading',
                form: { content: ['First Paragraph'] }
              },
              {
                heading: 'Second Heading',
                form: { content: ['Second Paragraph'] }
              }
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
        repository: 'commonform.org',
        publisher: 'kemitchell',
        project: 'legal-action',
        // Use 1e, but upgrade if possible.
        edition: '1e',
        upgrade: 'yes',
        substitutions: { terms: {}, headings: {} }
      }
    ]
  },
  { limit: 1 },
  function (error, upgradedForm) {
    assert.ifError(error)
    loadComponents(
      {
        content: [
          {
            repository: 'commonform.org',
            publisher: 'kemitchell',
            project: 'legal-action',
            // Use 1e1c specifically.
            edition: '1e1c',
            substitutions: { terms: {}, headings: {} }
          }
        ]
      },
      { limit: 1 },
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
        repository: 'commonform.org',
        publisher: 'kemitchell',
        project: 'legal-action',
        edition: '1e',
        upgrade: 'yes',
        substitutions: { terms: {}, headings: {} }
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
            repository: 'commonform.org',
            publisher: 'kemitchell',
            project: 'legal-action',
            edition: '1e',
            substitutions: { terms: {}, headings: {} }
          }
        ]
      },
      { limit: 1 },
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

The function calls back with its resolutions for `upgrade: 'yes'` components:

```javascript
loadComponents(
  {
    content: [
      {
        heading: 'Contains Component',
        form: {
          content: [
            {
              repository: 'commonform.org',
              publisher: 'kemitchell',
              project: 'legal-action',
              edition: '1e',
              upgrade: 'yes',
              substitutions: { terms: {}, headings: {} }
            }
          ]
        }
      }
    ]
  },
  {},
  function (error, upgradedForm, resolutions) {
    assert.ifError(error)
    assert.deepEqual(
      resolutions,
      [
        {
          path: ['content', 0, 'form', 'content', 0],
          repository: 'commonform.org',
          publisher: 'kemitchell',
          project: 'legal-action',
          upgrade: true,
          specified: '1e',
          edition: '1e1c'
        }
      ]
    )
  }
)

loadComponents(
  {
    content: [
      {
        repository: 'commonform.org',
        publisher: 'test',
        project: 'nested-components',
        edition: '1e',
        substitutions: { terms: {}, headings: {} }
      }
    ]
  },
  {},
  function (error, upgradedForm, resolutions) {
    assert.ifError(error)
    var expected = [
      {
        path: ['content', 0],
        repository: 'commonform.org',
        publisher: 'test',
        project: 'nested-components',
        upgrade: false,
        edition: '1e'
      },
      {
        path: ['content', 0, 'form', 'content', 0],
        repository: 'commonform.org',
        publisher: 'test',
        project: 'uses-component',
        upgrade: true,
        specified: '1e',
        edition: '1e'
      },
      {
        path: [
          'content', 0,
          'form', 'content', 0,
          'form', 'content', 5
        ],
        repository: 'commonform.org',
        publisher: 'kemitchell',
        project: 'apache-style-license-grant',
        upgrade: true,
        specified: '1e',
        edition: '1e1c'
      }
    ]
    assert.deepEqual(resolutions, expected)
  }
)
```

You can also prevent upgrades with `{ original: true }`:

```javascript
loadComponents(
  {
    content: [
      {
        repository: 'commonform.org',
        publisher: 'kemitchell',
        project: 'legal-action',
        edition: '1e',
        upgrade: 'yes',
        substitutions: { terms: {}, headings: {} }
      }
    ]
  },
  { limit: 1, original: true },
  function (error, loaded, resolutions) {
    assert.ifError(error)
    assert.deepStrictEqual(resolutions, [
      {
        path: ['content', 0],
        repository: 'commonform.org',
        publisher: 'kemitchell',
        project: 'legal-action',
        upgrade: true,
        edition: '1e'
      }
    ])
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
        repository: 'commonform.org',
        publisher: 'kemitchell',
        project: 'legal-action',
        edition: '1e',
        upgrade: 'yes',
        substitutions: { terms: {}, headings: {} }
      }
    ]
  },
  {
    caches: {
      editions: {
        get: function (
          repository,
          publisher,
          project,
          callback
        ) {
          callback(null, ['1e'])
        }
      },
      forms: {
        get: function (
          repository,
          publisher,
          project,
          edition,
          callback
        ) {
          callback(null, {
            content: [
              { definition: 'Legal Claim' },
              ' means any legal action or claim, ignoring the historical distinction between "in law" and "in equity".'
            ]
          })
        }
      }
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
        repository: 'commonform.org',
        publisher: 'kemitchell',
        project: 'legal-action',
        edition: '1e',
        upgrade: 'yes',
        substitutions: { terms: {}, headings: {} }
      }
    ]
  },
  { repositories: ['different.org'] },
  function (error) {
    assert(error)
    assert.equal(
      error.message, 'unauthorized repository: commonform.org'
    )
    assert.equal(error.repository, 'commonform.org')
  }
)
```

The function will yield an error when a component tries to incorporate itself:

```javascript
var cyclical = {
  repository: 'commonform.org',
  publisher: 'kemitchell',
  project: 'cyclical',
  edition: '1e',
  substitutions: { terms: {}, headings: {} }
}

loadComponents(
  { content: [cyclical] },
  {
    caches: {
      forms: {
        get: function (
          repository, publisher, project, edition, callback
        ) {
          callback(null, { content: [cyclical] })
        }
      },
      editions: {
        get: function (
          repository, publisher, project, edition, callback
        ) {
          callback(null, ['1e'])
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
