# Define

Build contracts and stateful contract builders.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Define](#definecontract-contractfn-guard-guardinput-contractfn)
  - [Define.state](#definestatevaluetype-argstypeinitialstate-valuetype-stepfn-stepfn-statefulcontract)
  - [Async Contracts](#async-contracts)

## Quick Start

```typescript
import { Define } from '@neabyte/typebox'

// Operation, maps input to output
const add = Define((props: { a: number; b: number }) => props.a + props.b)

// Data, input is not meaningful
const appName = Define(() => 'typebox')

// Validation, contract with a guard
const signup = Define(
  (props: { name: string; age: number }) => ({ id: 1, name: props.name }),
  (props) => (props.age >= 18 ? true : 'age must be at least 18')
)

// Async, returns a promise
const fetchUser = Define(async (props: { id: number }) => ({ id: props.id, name: 'neo' }))

// State, output becomes the next input
const counter = Define.state(0, (count, amount: number) => count + amount)
```

These are inert values. A contract becomes callable only after [`Loader`](Loader.md) activates it.

## API Reference

### `Define(contract: ContractFn, guard?: GuardInput): ContractFn`

Build a contract. A contract is a single-input function from an input shape to an output shape. When no guard is passed, `Define` returns the contract unchanged.

```typescript
// Plain operation
const slug = Define((props: { text: string }) => props.text.toLowerCase().replaceAll(' ', '-'))

// Data contract, input is not used
const version = Define(() => 1)
```

When a `guard` is provided, `Define` returns a wrapper. On each call the wrapper runs every guard first and only then runs the contract. When the input is an object, `Define` deep-freezes it in place with [`Object.freeze`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) before the guards run, so the caller's own object becomes frozen and neither the guards nor the caller can mutate it afterward. The prototype and methods are preserved, so an instance stays an instance and its methods remain callable. The same frozen reference is passed to the guards and then to the contract. Before the guards run, a string input longer than 10000 characters is rejected with a [`TypeError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError) whose `message` is `input exceeds 10000 characters` and whose `cause` is `['input exceeds 10000 characters']`. While an object input is frozen, any nested string value longer than 10000 characters is rejected the same way, and an object nested 256 levels or deeper is rejected with a `TypeError` whose `message` is `input nesting exceeds 256 levels` and whose `cause` is `['input nesting exceeds 256 levels']`. A failing guard throws a `TypeError` whose `message` joins the reasons and whose [`cause`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause) holds the full reason list. Callers detect it with `error instanceof Error && Array.isArray(error.cause)` and read the reasons from `error.cause`. See [Validation](Validation.md) for the verdict and rejection rules.

```typescript
const signup = Define(
  (props: { name: string; email: string; age: number }) => ({ id: 1, name: props.name }),
  (props) => {
    const reasons: string[] = []
    if (props.name.trim().length === 0) {
      reasons.push('name must not be empty')
    }
    if (!props.email.includes('@')) {
      reasons.push('email must contain @')
    }
    if (props.age < 18) {
      reasons.push('age must be at least 18')
    }
    return reasons.length === 0 ? true : reasons
  }
)

try {
  signup({ name: '', email: 'bad', age: 12 })
} catch (error) {
  if (error instanceof Error && Array.isArray(error.cause)) {
    // all collected reasons
    console.log(error.cause)
  }
}
```

A `guard` may be one function or a list. Every guard runs in order, and the first one that returns reasons rejects.

```typescript
const create = Define(
  (props: { name: string }) => props,
  [
    (props) => (props.name.length > 0 ? true : 'name required'),
    (props) => (props.name.length <= 32 ? true : 'name too long')
  ]
)
```

Guards must be synchronous, and only guard rejections carry a `cause`. An error thrown from inside the contract itself propagates as is, keeping its original type and stack. See [Validation](Validation.md) for the full verdict and rejection rules.

### `Define.state<ValueType, ArgsType>(initialState: ValueType, stepFn: StepFn): StatefulContract`

Build a stateful contract from an initial value and a step reducer. The payload type is read from the step arity. A one-argument step needs no payload, and a two-argument step requires that payload when the handle is called. A stateful contract is inert until [`Loader`](Loader.md) turns it into a [`StateHandle`](State.md); see [State](State.md) for the immutability and seed-cloning rules.

```typescript
// Two-argument step, payload required
const counter = Define.state(0, (count, amount: number) => count + amount)

// One-argument step, no payload
const ticks = Define.state(0, (count) => count + 1)

// Object state, payload is the price
const cart = Define.state({ items: 0, total: 0 }, (cartState, price: number) => ({
  items: cartState.items + 1,
  total: cartState.total + price
}))
```

### Async Contracts

A contract may return a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). The facade output type unwraps it to a single [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await). See [`UnwrapOutput`](Types.md#unwrapoutputoutputtype) for the type-level rule.

```typescript
const getRepo = Define(async (props: { owner: string; name: string }) => {
  await Promise.resolve()
  return { name: `${props.owner}/${props.name}`, stars: 1337 }
})
```

> [!NOTE]
> `Define` is monomorphic. A per-call generic on a contract is erased to its constraint once the contract is placed in a map. When a generic must survive per call, wrap the contract from outside and delegate to a contract typed over the union.
