# Validation

Guards, verdicts, and fail-closed rejection.

## Table of Contents

- [Quick Start](#quick-start)
- [Verdicts](#verdicts)
- [Reading Rejections](#reading-rejections)
- [API Reference](#api-reference)
  - [GuardFn](#guardfncontracttype)
  - [GuardVerdict](#guardverdict)
  - [Behavior Notes](#behavior-notes)

## Quick Start

A guard is the optional second argument to [`Define`](Define.md#definecontract-contractfn-guard-guardinput-contractfn). It runs before the contract and decides if the input may pass.

```typescript
import { Define } from '@neabyte/typebox'

const signup = Define(
  (props: { name: string; age: number }) => ({ id: 1, name: props.name }),
  (props) => (props.age >= 18 ? true : 'age must be at least 18')
)

signup({ name: 'neo', age: 30 }) // { id: 1, name: 'neo' }

try {
  signup({ name: 'kid', age: 12 })
} catch (error) {
  if (error instanceof Error && Array.isArray(error.cause)) {
    console.log(error.cause) // ['age must be at least 18']
  }
}
```

## Verdicts

A guard returns a `GuardVerdict`. Validation is fail-closed, so a guard can never let bad input pass by mistake.

| Verdict                 | Meaning                                              |
| ----------------------- | ---------------------------------------------------- |
| `true`                  | Pass                                                 |
| a non-empty `string`    | Reject with that one reason                          |
| a `string[]` of reasons | Reject with all reasons                              |
| an empty array `[]`     | Reject with a generic reason `'validation failed'`   |
| anything else           | Invalid verdict, rejected with `'validation failed'` |

Only `true`, a string, or an array whose every member is a string is a valid verdict. Anything else, such as `false`, `0`, `NaN`, a number, a plain object, or a mixed array, is treated as invalid and rejected.

```typescript
// collect every failure in one pass
const create = Define(
  (props: { username: string; password: string }) => props,
  (props) => {
    const reasons: string[] = []
    if (props.username.length < 3) {
      reasons.push('username must be at least 3 characters')
    }
    if (props.password.length < 8) {
      reasons.push('password must be at least 8 characters')
    }
    return reasons.length === 0 ? true : reasons
  }
)
```

A guard may be one function or a list. Every guard runs in order, and the first one that returns reasons rejects.

```typescript
const create = Define(
  (props: { name: string }) => props,
  [
    (props) => (props.name.length > 0 ? true : 'name required'),
    (props) => (props.name.length <= 32 ? true : 'name too long')
  ]
)
```

## Reading Rejections

On failure the reasons are thrown as a [`TypeError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError). The `message` joins the reasons with the separator `"; "`, and the full reason list is on [`cause`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause). Read `cause` instead of parsing the message. Only a guard rejection carries a `cause`; an error thrown from inside a contract or a [step](State.md) is not wrapped and propagates as is, keeping its original type and full stack trace.

```typescript
try {
  create({ name: '' })
} catch (error) {
  if (error instanceof Error && Array.isArray(error.cause)) {
    const reasons = error.cause as readonly string[]
    for (const reason of reasons) {
      console.log('-', reason)
    }
  }
}
```

## API Reference

### `GuardFn<ContractType>`

A synchronous guard for a contract's input. It receives the same input as the contract and returns a `GuardVerdict`. See [`GuardFn`](Types.md#guardfncontracttype) for the full generic form.

```typescript
type GuardFn = (input: ContractInput) => GuardVerdict
```

### `GuardVerdict`

```typescript
type GuardVerdict = true | string | readonly string[]
```

### Behavior Notes

- Each guard receives a deep-frozen structured clone of the input when the input is an object, so a guard can read but cannot mutate it. The caller's value is never frozen or changed.
- Guards must be synchronous. Returning a [thenable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) throws `TypeError('async guard unsupported')`.
- A string input longer than 10000 characters is rejected before any guard runs, with the length reason on `cause`.
- An invalid verdict throws `TypeError('guard returned invalid verdict')` with `cause: ['validation failed']`.
