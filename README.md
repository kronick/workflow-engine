# Business Logic Engine

## TODO:

- [x] Derive calculated fields
- [ ] Action definition (transitions without exit state?)
- [ ] Automatic audit history log
- [ ] References between resources
- [x] Decide if expressions need to be async (for loading references). Or use continuations?
- [ ] DFS / Topo sort for calculated fields and references
- [x] Input objects to transitions & actions
- [x] Input validation on actions
- [ ] Refactor input validation to specify field that error should be reported on
- [ ] E-mails and other side effects in actions
- [ ] Automatic role assignment (ball-in-court if a condition is met, etc)
- [x] [Demo frontend](demo/README.md) (run engine client-side)
- [x] Expression standard library
- [ ] Custom functions in system definition -> expression context
- [ ] User objects in expressions
- [ ] updateResource
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

## Order of operations

When performing an action, the following steps are evaluated in order

1. Retrieve resource properties
2. Calculate resource calculated properties
3. TODO: Evaluate resource-relationship role expressions (i.e. "ball-in-court" or "creator")
4. TODO: Evaluate resource-level write permissions
5. Evaluate action-level conditions
6. Evaluate action-level permissions
7. Update resource state (if applicable)
8. Apply defined effects (in order)
9. Write action and effects list to history log (if applicable)

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
        "invalidMessage": "Document text must be longer than the title.",
        "reportOnFields": ["text", "title"]
      }
    ]
  }
```
