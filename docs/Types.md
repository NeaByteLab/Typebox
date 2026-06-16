# Types

Compile-time shapes exported for advanced usage.

Typebox is compile-time only. Types vanish at runtime, and there is no runtime schema object. All public types are re-exported from the package entry with `export type *`, so you can import any of the names below.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Shapes](#core-shapes)
- [Guard Shapes](#guard-shapes)
- [State Shapes](#state-shapes)
- [Facade Shapes](#facade-shapes)
- [Utility Shapes](#utility-shapes)

## Quick Start

```typescript
import type { ContractFn, GuardVerdict, StateHandle } from '@neabyte/typebox'
```

## Core Shapes

### `ContractFn`

The atom. A single-input contract function from an input shape to an output shape. See [Define](Define.md) for how contracts are built.

```typescript
type ContractFn = (input: never) => unknown
```

### `ContractInput<ContractType>`

The first parameter type of a contract.

```typescript
type ContractInput<ContractType extends ContractFn> = Parameters<ContractType>[0]
```

### `ContractEntry`

A contract function or a stateful base entry. This is the value type of a contract map.

```typescript
type ContractEntry = ContractFn | StatefulBase
```

### `ContractMap`

A record mapping names to contract entries. This is the input to [`Loader`](Loader.md).

```typescript
type ContractMap = Record<string, ContractEntry>
```

## Guard Shapes

See [Validation](Validation.md) for how these are used at runtime.

### `GuardFn<ContractType>`

A synchronous guard for a contract's input.

```typescript
type GuardFn<ContractType extends ContractFn> = (input: ContractInput<ContractType>) => GuardVerdict
```

### `GuardInput<ContractType>`

One guard or a list of guards for a contract.

```typescript
type GuardInput<ContractType extends ContractFn> =
  | GuardFn<ContractType>
  | readonly GuardFn<ContractType>[]
```

### `GuardVerdict`

A guard result as a pass flag or a set of reasons.

```typescript
type GuardVerdict = true | string | readonly string[]
```

## State Shapes

See [State](State.md) for the runtime behavior of these shapes.

### `StatefulContract<ValueType, PayloadType>`

A fully typed stateful contract that holds an initial state and a step reducer. Built by [`Define.state`](Define.md#definestatevaluetype-argstypeinitialstate-valuetype-stepfn-stepfn-statefulcontract).

### `StateHandle<ValueType, PayloadType>`

The live form of a stateful contract. Call it to advance state, and call `get()` to read the current immutable value.

```typescript
interface StateHandle<ValueType, PayloadType> {
  (...args: [PayloadType] extends [NoPayload] ? [] : [payload: PayloadType]): ValueType
  get(): DeepImmutable<ValueType>
}
```

### `StepFn<ValueType, ArgsType>`

A reducer that advances state by one step. Its arity decides whether a payload is required.

```typescript
type StepFn<ValueType, ArgsType extends [] | [unknown]> = (
  state: ValueType,
  ...args: ArgsType
) => ValueType
```

### `PayloadOf<ArgsType>`

The payload type read from a step's argument tuple. A two-argument step yields its payload, and a one-argument step yields the no-payload marker.

### `StatefulApi`

The public stateful builder API, exposed as `Define.state`.

```typescript
interface StatefulApi {
  state<ValueType, ArgsType extends [] | [unknown]>(
    initialState: ValueType,
    stepFn: StepFn<ValueType, ArgsType>
  ): StatefulContract<ValueType, PayloadOf<ArgsType>>
}
```

## Facade Shapes

### `LoadedFacade<ContractMapType>`

The facade returned by [`Loader`](Loader.md). Every key maps to its activated entry.

```typescript
type LoadedFacade<ContractMapType extends ContractMap> = {
  readonly [Key in keyof ContractMapType]: LiveEntry<ContractMapType[Key]>
}
```

### `LiveEntry<EntryType>`

The activated entry for one map entry. A stateful entry becomes a [`StateHandle`](#statehandlevaluetype-payloadtype), and a contract becomes a plain callable with normalized output.

### `UnwrapOutput<OutputType>`

Normalizes a contract output for the facade. A [`PromiseLike`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html#async-functions) output is flattened with [`Awaited`](https://www.typescriptlang.org/docs/handbook/utility-types.html#awaitedtype) so the value is reached with one [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await).

```typescript
type UnwrapOutput<OutputType> = OutputType extends PromiseLike<unknown>
  ? Promise<Awaited<OutputType>>
  : OutputType
```

## Utility Shapes

### `DeepImmutable<SourceType>`

A recursively immutable version of a type. Functions pass through, [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) and [`Set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) become their readonly forms with immutable members, and objects become deeply readonly. Used for [`StateHandle.get()`](State.md#handleget-deepimmutablevaluetype) reads.

```typescript
type DeepImmutable<SourceType> = SourceType extends (...args: never[]) => unknown ? SourceType
  : SourceType extends ReadonlyMap<infer KeyType, infer ValueType>
    ? ReadonlyMap<KeyType, DeepImmutable<ValueType>>
  : SourceType extends ReadonlySet<infer ValueType> ? ReadonlySet<DeepImmutable<ValueType>>
  : SourceType extends object
    ? { readonly [Key in keyof SourceType]: DeepImmutable<SourceType[Key]> }
  : SourceType
```

### `ThenableLike`

An object with an optional `then` property. Used to detect async guards at runtime.

```typescript
type ThenableLike = { readonly then?: unknown }
```
