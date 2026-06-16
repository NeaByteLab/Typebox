import { assertEquals, assertStrictEquals, assertThrows } from '@std/assert'
import { Define, type StatefulContract } from '@neabyte/typebox'
import Helpers from '@app/helpers.ts'
import Globals from '@app/globals.ts'

interface CallableHandle {
  (payload?: unknown): unknown
  get(): unknown
}

Deno.test('Helpers - defineFn accepts a string input at the limit', () => {
  const wrapped = Helpers.defineFn(
    (input: string) => input.length,
    () => true
  )
  const atLimit = 'a'.repeat(Globals.maxGuardInputLength)
  assertEquals(wrapped(atLimit), Globals.maxGuardInputLength)
})

Deno.test(
  'Helpers - defineFn freezes the original input in place for the guard',
  () => {
    let frozenInsideGuard = false
    let sameReference = false
    const source = { value: 1 }
    const wrapped = Helpers.defineFn(
      (input: { value: number }) => input,
      (input) => {
        frozenInsideGuard = Object.isFrozen(input)
        sameReference = input === source
        return true
      }
    )
    wrapped(source)
    assertEquals(frozenInsideGuard, true)
    assertEquals(sameReference, true)
    assertEquals(Object.isFrozen(source), true)
  }
)

Deno.test('Helpers - defineFn passes the original input to the contract', () => {
  const source = { value: 1 }
  const wrapped = Helpers.defineFn(
    (input: { value: number }) => input,
    () => true
  )
  assertStrictEquals(wrapped(source), source)
})

Deno.test('Helpers - defineFn preserves prototype and methods for the guard', () => {
  class Box {
    constructor(public value: number) {}
    double(): number {
      return this.value * 2
    }
  }
  let isInstance = false
  let methodResult = 0
  const wrapped = Helpers.defineFn(
    (input: Box) => input,
    (input) => {
      isInstance = input instanceof Box
      methodResult = input.double()
      return true
    }
  )
  wrapped(new Box(21))
  assertEquals(isInstance, true)
  assertEquals(methodResult, 42)
})

Deno.test('Helpers - defineFn rejects a string input longer than the limit', () => {
  const wrapped = Helpers.defineFn(
    (input: string) => input,
    () => true
  )
  const long = 'a'.repeat(Globals.maxGuardInputLength + 1)
  const error = assertThrows(() => wrapped(long), TypeError, 'input exceeds 10000 characters')
  assertEquals((error as Error).cause, ['input exceeds 10000 characters'])
})

Deno.test('Helpers - defineFn returns the contract unchanged when no guard', () => {
  const contract = (input: { n: number }): number => input.n + 1
  const result = Helpers.defineFn(contract)
  assertStrictEquals(result, contract)
})

Deno.test('Helpers - defineFn runs guards in order and joins reasons', () => {
  const wrapped = Helpers.defineFn(
    (input: { name: string }) => input,
    [
      (input) => (input.name.length > 0 ? true : 'name required'),
      (input) => (input.name.length <= 3 ? true : 'name too long')
    ]
  )
  const error = assertThrows(() => wrapped({ name: 'toolong' }), TypeError, 'name too long')
  assertEquals((error as Error).cause, ['name too long'])
})

Deno.test('Helpers - defineFn runs the contract when the guard passes', () => {
  const wrapped = Helpers.defineFn(
    (input: { age: number }) => ({ ok: input.age }),
    (input) => (input.age >= 18 ? true : 'too young')
  )
  assertEquals(wrapped({ age: 21 }), { ok: 21 })
})

Deno.test('Helpers - defineFn throws TypeError with reasons on cause when guard rejects', () => {
  const wrapped = Helpers.defineFn(
    (input: { age: number }) => input,
    (input) => (input.age >= 18 ? true : 'age must be at least 18')
  )
  const error = assertThrows(() => wrapped({ age: 12 }), TypeError, 'age must be at least 18')
  assertEquals((error as Error).cause, ['age must be at least 18'])
})

Deno.test('Helpers - defineFn throws when a guard returns a thenable', () => {
  const wrapped = Helpers.defineFn(
    (input: { n: number }) => input,
    () => Promise.resolve(true) as unknown as true
  )
  assertThrows(() => wrapped({ n: 1 }), TypeError, 'async guard unsupported')
})

Deno.test('Helpers - isStateful detects stateful entries', () => {
  const stateful = Define.state(0, (count, amount: number) => count + amount)
  assertEquals(Helpers.isStateful(stateful as StatefulContract<number, number>), true)
})

Deno.test('Helpers - isStateful is false for plain contracts', () => {
  const contract = ((input: never) => input) as (input: never) => unknown
  assertEquals(Helpers.isStateful(contract), false)
})

Deno.test('Helpers - liveStateful advances and stores the next state', () => {
  const stateful = Define.state(0, (count, amount: number) => count + amount)
  const handle = Helpers.liveStateful(
    stateful as StatefulContract<unknown, never>
  ) as unknown as CallableHandle
  assertEquals(handle(5), 5)
  assertEquals(handle(2), 7)
  assertEquals(handle.get(), 7)
})

Deno.test('Helpers - liveStateful builds a handle starting at the initial state', () => {
  const stateful = Define.state(5, (count, amount: number) => count + amount)
  const handle = Helpers.liveStateful(stateful as StatefulContract<unknown, never>)
  assertEquals(handle.get(), 5)
})

Deno.test('Helpers - liveStateful clones the seed so the caller value is untouched', () => {
  const seed = { items: 0 }
  const stateful = Define.state(seed, (state: { items: number }, count: number) => ({
    items: state.items + count
  }))
  const handle = Helpers.liveStateful(
    stateful as StatefulContract<unknown, never>
  ) as unknown as CallableHandle
  handle(3)
  assertEquals(seed.items, 0)
  assertEquals(Object.isFrozen(seed), false)
})

Deno.test('Helpers - liveStateful does not re-freeze when step returns the same reference', () => {
  const stateful = Define.state({ items: 0 }, (state) => state)
  const handle = Helpers.liveStateful(
    stateful as StatefulContract<unknown, never>
  ) as unknown as CallableHandle
  const before = handle.get()
  const after = handle()
  assertStrictEquals(after, before)
})

Deno.test('Helpers - liveStateful keeps state when the step throws', () => {
  const stateful = Define.state(10, (count, amount: number) => {
    if (amount < 0) {
      throw new Error('no negatives')
    }
    return count + amount
  })
  const handle = Helpers.liveStateful(
    stateful as StatefulContract<unknown, never>
  ) as unknown as CallableHandle
  handle(5)
  assertThrows(() => handle(-1), Error, 'no negatives')
  assertEquals(handle.get(), 15)
})

Deno.test('Helpers - reasonsOf maps an empty array to a generic reason', () => {
  assertEquals(Helpers.reasonsOf([]), ['validation failed'])
})

Deno.test('Helpers - reasonsOf returns a non-empty string array as is', () => {
  assertEquals(Helpers.reasonsOf(['a', 'b']), ['a', 'b'])
})

Deno.test('Helpers - reasonsOf returns no reasons for true', () => {
  assertEquals(Helpers.reasonsOf(true), [])
})

Deno.test('Helpers - reasonsOf throws on an invalid verdict', () => {
  const error = assertThrows(
    () => Helpers.reasonsOf(0 as unknown as true),
    TypeError,
    'guard returned invalid verdict'
  )
  assertEquals((error as Error).cause, ['validation failed'])
})

Deno.test('Helpers - reasonsOf throws on a mixed array verdict', () => {
  assertThrows(
    () => Helpers.reasonsOf(['ok', 1] as unknown as readonly string[]),
    TypeError,
    'guard returned invalid verdict'
  )
})

Deno.test('Helpers - reasonsOf wraps a single string reason', () => {
  assertEquals(Helpers.reasonsOf('bad'), ['bad'])
})

Deno.test('Helpers - statefulMark mirrors Globals.statefulMark', () => {
  assertStrictEquals(Helpers.statefulMark, Globals.statefulMark)
})
