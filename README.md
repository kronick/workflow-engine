# Business Logic Engine

## TODO:

- [ ] Derive calculated fields
- [x] Demo frontend (run engine client-side)
- [ ] References between resources
- [ ] Action definition (transintions without exit state?)
- [x] Expression standard library
- [ ] Custom functions in system definition -> expression context
- [ ] User objects in expressions
- [ ] updateResource
- [ ] Input objects to transitions &
      actions
- [ ] Input validation on updates, transitions, actions
- [ ] Automatic audit history log
- [ ] i18n?
- [ ] E-mails and other side effects in actions
- [x] Per-resource read permissions
- [ ] Per-resource write permissions
- [ ] Decide if expressions need to be async
- [ ] Consistent exception handling
- [ ] Cache & transaction control for data loader API
- [ ] SQL data loader
- [ ] Cleaner internal object validation
- [ ] Expression language docs
- [ ] Deletion rules (cascade, conditions)
- [ ] Service layer generator (REST & GraphQL)
- [ ] Expression test runner
- [ ] Automatic role assignment (ball-in-court if a condition is met, etc)
- [ ] Visibility control (allow / deny / hide ?) for properties and objects

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
- Run the script in `index.ts` with
  ```
  yarn start
  ```
- Run on every file change with
  ```
  yarn build:live
  ```
