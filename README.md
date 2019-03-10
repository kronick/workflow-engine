# Business Logic Engine

## TODO:

- [x] Derive calculated fields
- [ ] Automatic audit history log
- [ ] References between resources
- [ ] Decide if expressions need to be async (for loading references)
- [ ] DFS / Topo sort for calculated fields and references
- [ ] Input objects to transitions &
      actions
- [ ] Action definition (transitions without exit state?)
- [ ] E-mails and other side effects in actions
- [ ] Automatic role assignment (ball-in-court if a condition is met, etc)
- [x] [Demo frontend](demo/README.md) (run engine client-side)
- [x] Expression standard library
- [ ] Custom functions in system definition -> expression context
- [ ] User objects in expressions
- [ ] updateResource
- [ ] Input validation on updates, transitions, actions
- [ ] i18n strings (for error messages or otherwise)
- [ ] Visibility control (allow / deny / _hide_ ?) for properties and objects
- [x] Per-resource read permissions
- [ ] Deletion rules (cascade, conditions)
- [ ] Consistent exception handling
- [ ] Cache & transaction control for data loader API
- [ ] SQL data loader
- [ ] Cleaner internal object validation
- [ ] Expression language docs
- [ ] Service layer generator (REST & GraphQL)
- [ ] Expression test runner

## Usage

- First, make sure you have [`yarn` installed](https://yarnpkg.com/lang/en/docs/install/).
- Install dependencies with
  ```
  yarn install
  ```
- Run tests with
  ```
  yarn test
  ```
- Run tests on every change with
  ```
  yarn test:live
  ```
- Run only one set of tests by specifying its filename i.e.:
  ```
  yarn test:live expressions.test.ts
  ```
- Run the script in `index.ts` with
  ```
  yarn start
  ```
- Run on every file change with
  ```
  yarn build:live
  ```

### Input validation

Something like this?

```
{
  "editDocument": {
    "from": [
      "authoring",
      "revising"
    ],
    "input": {
      "title": {
        "type": "string",
        "constraints": [
          { "minLength": 1 },
          { "regex": "*." }
        ]
      },
      "text": {
        "type": "string"
      }
    },
    "validation": [
      {
        "reportOnField": "text",
        "invalidIf": {
          ">": [
            {
              "stringLength": {
                "getInput": "title"
              }
            },
            {
              "stringLength": {
                "getInput": "text"
              }
            }
          ]
        },
        "invalidMessage": "Document text must be longer than the title."
      }
    ]
  }
```
