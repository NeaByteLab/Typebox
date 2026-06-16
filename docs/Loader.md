# Loader

Activate a contract map into a live callable facade.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Independent State](#independent-state)

## Quick Start

```typescript
import { Define, Loader } from '@neabyte/typebox'

const app = Loader({
  add: Define((props: { a: number; b: number }) => props.a + props.b),
  counter: Define.state(0, (count, amount: number) => count + amount)
})

app.add({ a: 2, b: 3 }) // 5
app.counter(5) // 5
app.counter.get() // 5
```

## API Reference

### `Loader<ContractMapType>(contractMap: ContractMapType): LoadedFacade<ContractMapType>`

Bring a contract map to life. `Loader` walks each entry and activates it into its live form:

- A plain contract built by [`Define`](Define.md) stays a callable function. Its output type is normalized, so a promise resolves with one `await`.
- A stateful contract built by [`Define.state`](Define.md#definestatevaluetype-argstypeinitialstate-valuetype-stepfn-stepfn-statefulcontract) becomes a [`StateHandle`](State.md). Call it to advance state and read the current value with `get()`.

```typescript
const app = Loader({
  // data and operation stay callable
  appName: Define(() => 'typebox'),
  slug: Define((props: { text: string }) => props.text.toLowerCase().replaceAll(' ', '-')),

  // async stays callable, unwraps the promise
  fetchUser: Define(async (props: { id: number }) => ({ id: props.id, name: 'neo' })),

  // state becomes a StateHandle
  counter: Define.state(0, (count, amount: number) => count + amount)
})

app.appName() // 'typebox'
app.slug({ text: 'Hello World' }) // 'hello-world'
await app.fetchUser({ id: 7 }) // { id: 7, name: 'neo' }
app.counter(2) // 2
app.counter.get() // 2
```

The facade is fully typed from the map. Every key maps to its activated entry, with input, output, and state shapes inferred from the contracts. See [`LoadedFacade`](Types.md#loadedfacadecontractmaptype) for the type-level shape.

```typescript
type Light = 'red' | 'green' | 'yellow'

const machine = Loader({
  light: Define.state('red' as Light, (current) => {
    const transitions: Record<Light, Light> = { red: 'green', green: 'yellow', yellow: 'red' }
    return transitions[current]
  }),
  canGo: Define((props: { state: Light }) => props.state === 'green')
})

machine.light.get() // 'red'
machine.light() // 'green'
machine.canGo({ state: 'green' }) // true
```

An entry whose value is `undefined` is skipped and does not appear on the facade.

## Independent State

Each stateful entry holds its own state. Loading the same map twice produces two facades that do not share state, because each activation clones the seed into owned state before freezing. See [State](State.md#immutability) for the cloning and freezing rules.

```typescript
const blueprint = {
  counter: Define.state(0, (count, amount: number) => count + amount)
}

const first = Loader(blueprint)
const second = Loader(blueprint)

first.counter(5) // 5
second.counter.get() // 0, second is untouched
```
