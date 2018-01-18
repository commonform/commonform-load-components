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
```
