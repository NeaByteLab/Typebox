# State

Reducer-style stateful contracts with deep-immutable reads.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [handle(payload?)](#handlepayload-valuetype)
  - [handle.get()](#handleget-deepimmutablevaluetype)
- [Immutability](#immutability)

## Quick Start

```typescript
import { Define, Loader } from '@neabyte/typebox'

const app = Loader({
  counter: Define.state(0, (count, amount: number) => count + amount)
})

app.counter.get() // 0
app.counter(5) // 5
app.counter(2) // 7
app.counter.get() // 7
```

## API Reference

A stateful contract is built by [`Define.state`](Define.md#definestatevaluetype-argstypeinitialstate-valuetype-stepfn-stepfn-statefulcontract). Once [`Loader`](Loader.md) activates it, the entry becomes a `StateHandle`: a function with a `get()` method. See [`StateHandle`](Types.md#statehandlevaluetype-payloadtype) for the type.

The `stepFn` returns a new value instead of changing the current one in place, so the handle stays in control of what is stored.

### `handle(payload?): ValueType`

Advance the state. The handle runs the step with the current value and the payload, stores the returned value, and returns it. A two-argument step requires a payload, and a one-argument step takes none.

```typescript
const app = Loader({
  counter: Define.state(0, (count, amount: number) => count + amount),
  ticks: Define.state(0, (count) => count + 1)
})

app.counter(5) // 5, payload required
app.ticks() // 1, no payload
app.ticks() // 2
```

### `handle.get(): DeepImmutable<ValueType>`

Read the current state without changing it. The return type is [`DeepImmutable`](Types.md#deepimmutablesourcetype), so callers cannot mutate the snapshot and leak changes back into the store.

```typescript
const app = Loader({
  cart: Define.state(
    { items: 0, total: 0 },
    (cartState, price: number) => ({ items: cartState.items + 1, total: cartState.total + price })
  )
})

app.cart(100)
app.cart(250)
app.cart.get() // { items: 2, total: 350 }
```

## Immutability

The handle keeps its value in a closure. Because the step returns a new value rather than changing the current one, a throw inside a step leaves the previous state in place.

```typescript
const app = Loader({
  safe: Define.state(10, (count, amount: number) => {
    if (amount < 0) {
      throw new Error('no negatives')
    }
    return count + amount
  })
})

app.safe(5) // 15
try {
  app.safe(-1) // throws, state unchanged
} catch {
  // ignore
}
app.safe.get() // 15
```

If a step returns the same reference it received (checked with [`Object.is`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)), the stored value is left as is and is not re-frozen.

The seed passed to `Define.state` belongs to the caller. When the handle comes to life it clones that seed with [`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) into owned state before freezing, so activating a contract never freezes or mutates the caller's object. A seed that cannot be cloned is rejected with `TypeError('stateful initial state must be structured cloneable')` rather than shared.

```typescript
const seed = { items: 0 }
const app = Loader({
  cart: Define.state(seed, (cartState, count: number) => ({ items: cartState.items + count }))
})

app.cart(3)
seed.items // 0, original seed untouched
```

Freezing is deep and collection-aware. A [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) or [`Set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) is rebuilt with frozen members and returned as a readonly view whose mutating methods (`set`, `add`, `delete`, `clear`) throw, everything else is frozen with [`Object.freeze`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) in place, and typed array views are left as is. See [`DeepImmutable`](Types.md#deepimmutablesourcetype) for the matching type.
