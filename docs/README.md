# Documentation

Complete API documentation for `@neabyte/typebox`.

## Concepts

- **[Define](Define.md)** - Build contracts and stateful contract builders.
- **[Loader](Loader.md)** - Activate a contract map into a live callable facade.
- **[State](State.md)** - Reducer-style stateful contracts with deep-immutable reads.
- **[Validation](Validation.md)** - Guards, verdicts, and fail-closed rejection.
- **[Types](Types.md)** - Compile-time shapes exported for advanced usage.

## Quick Reference

| Name           | Purpose                   | Form                                 |
| -------------- | ------------------------- | ------------------------------------ |
| `Define`       | Build a contract          | `Define(contract, guard?)`           |
| `Define.state` | Build a stateful contract | `Define.state(initialState, stepFn)` |
| `Loader`       | Activate a contract map   | `Loader(contractMap)`                |
| `StateHandle`  | Live stateful entry       | `handle(payload?)` / `handle.get()`  |

## The Atom

```typescript
type ContractFn = (input: never) => unknown
```

Every face of Typebox is the same atom in a different role:

| Face       | Form                                              | Description                                    |
| ---------- | ------------------------------------------------- | ---------------------------------------------- |
| Operation  | `Define((props) => result)`                       | A plain contract                               |
| Data       | `Define(() => value)`                             | A contract with no meaningful input            |
| State      | `Define.state(initial, (state, payload) => next)` | A contract whose output becomes the next input |
| Validation | `Define(fn, guard)`                               | A contract with a guard                        |
| Async      | `Define(async (props) => value)`                  | A contract returning a promise                 |
