import { assertEquals, assertNotStrictEquals, assertStrictEquals, assertThrows } from '@std/assert'
import Utils from '@app/utils.ts'
import Globals from '@app/globals.ts'

Deno.test('Utils - deepFreeze allows a string value at the length limit', () => {
  const atLimit = 'a'.repeat(Globals.maxGuardInputLength)
  const frozen = Utils.deepFreeze({ token: atLimit })
  assertEquals(Object.isFrozen(frozen), true)
  assertEquals(frozen.token.length, Globals.maxGuardInputLength)
})

Deno.test('Utils - deepFreeze allows nesting at the depth limit', () => {
  let node: { child?: unknown } = {}
  const root = node
  for (let level = 0; level < Globals.maxFreezeDepth - 1; level++) {
    const next: { child?: unknown } = {}
    node.child = next
    node = next
  }
  const frozen = Utils.deepFreeze(root)
  assertEquals(Object.isFrozen(frozen), true)
})

Deno.test('Utils - deepFreeze handles cyclic references without infinite recursion', () => {
  const root: { self?: unknown } = {}
  root.self = root
  const frozen = Utils.deepFreeze(root)
  assertEquals(Object.isFrozen(frozen), true)
  assertStrictEquals(frozen.self, frozen)
})

Deno.test('Utils - deepFreeze leaves typed array views unfrozen', () => {
  const view = new Uint8Array([1, 2, 3])
  const frozen = Utils.deepFreeze(view)
  assertStrictEquals(frozen, view)
  assertEquals(Object.isFrozen(frozen), false)
})

Deno.test('Utils - deepFreeze passes primitives through unchanged', () => {
  assertEquals(Utils.deepFreeze(1), 1)
  assertEquals(Utils.deepFreeze('a'), 'a')
  assertEquals(Utils.deepFreeze(null), null)
  assertEquals(Utils.deepFreeze(undefined), undefined)
})

Deno.test('Utils - deepFreeze rebuilds and freezes Map contents', () => {
  const source = new Map<string, { v: number }>([['k', { v: 1 }]])
  const frozen = Utils.deepFreeze(source)
  assertEquals(frozen.get('k')?.v, 1)
  assertEquals(Object.isFrozen(frozen.get('k')), true)
  const writable = frozen as unknown as Map<string, { v: number }>
  assertThrows(() => writable.set('x', { v: 2 }), TypeError)
})

Deno.test('Utils - deepFreeze rebuilds and freezes Set contents', () => {
  const source = new Set<{ v: number }>([{ v: 1 }])
  const frozen = Utils.deepFreeze(source)
  for (const member of frozen) {
    assertEquals(Object.isFrozen(member), true)
  }
  const writable = frozen as unknown as Set<{ v: number }>
  assertThrows(() => writable.add({ v: 2 }), TypeError)
})

Deno.test('Utils - deepFreeze recursively freezes nested objects and arrays', () => {
  const nested = { outer: { inner: { value: 1 } }, list: [{ k: 1 }] }
  const frozen = Utils.deepFreeze(nested)
  assertEquals(Object.isFrozen(frozen), true)
  assertEquals(Object.isFrozen(frozen.outer), true)
  assertEquals(Object.isFrozen(frozen.outer.inner), true)
  assertEquals(Object.isFrozen(frozen.list), true)
  assertEquals(Object.isFrozen(frozen.list[0]), true)
})

Deno.test('Utils - deepFreeze rejects an oversized string value nested in an array', () => {
  const long = 'a'.repeat(Globals.maxGuardInputLength + 1)
  assertThrows(
    () => Utils.deepFreeze([{ deep: { value: long } }]),
    TypeError,
    `input exceeds ${Globals.maxGuardInputLength} characters`
  )
})

Deno.test('Utils - deepFreeze rejects an oversized string value nested in an object', () => {
  const long = 'a'.repeat(Globals.maxGuardInputLength + 1)
  const error = assertThrows(
    () => Utils.deepFreeze({ token: long }),
    TypeError,
    `input exceeds ${Globals.maxGuardInputLength} characters`
  )
  assertEquals((error as Error).cause, [`input exceeds ${Globals.maxGuardInputLength} characters`])
})

Deno.test('Utils - deepFreeze returns the same reference for plain objects', () => {
  const target = { a: 1 }
  const frozen = Utils.deepFreeze(target)
  assertStrictEquals(frozen, target)
})

Deno.test('Utils - deepFreeze skips already frozen nodes', () => {
  const target = Object.freeze({ a: 1 })
  const frozen = Utils.deepFreeze(target)
  assertStrictEquals(frozen, target)
})

Deno.test('Utils - deepFreeze throws a typed reason when nesting is too deep', () => {
  let node: { child?: unknown } = {}
  const root = node
  for (let level = 0; level < Globals.maxFreezeDepth + 5; level++) {
    const next: { child?: unknown } = {}
    node.child = next
    node = next
  }
  const error = assertThrows(
    () => Utils.deepFreeze(root),
    TypeError,
    `input nesting exceeds ${Globals.maxFreezeDepth} levels`
  )
  assertEquals((error as Error).cause, [`input nesting exceeds ${Globals.maxFreezeDepth} levels`])
})

Deno.test('Utils - isObject is false for primitives and null', () => {
  assertEquals(Utils.isObject(null), false)
  assertEquals(Utils.isObject(undefined), false)
  assertEquals(Utils.isObject(1), false)
  assertEquals(Utils.isObject('a'), false)
  assertEquals(Utils.isObject(true), false)
})

Deno.test('Utils - isObject is true for objects and arrays', () => {
  assertEquals(Utils.isObject({}), true)
  assertEquals(Utils.isObject([]), true)
  assertEquals(Utils.isObject(new Map()), true)
})

Deno.test('Utils - safeClone returns an independent structured clone', () => {
  const source = { a: 1, nested: { b: 2 } }
  const copy = Utils.safeClone(source)
  assertEquals(copy, source)
  assertNotStrictEquals(copy, source)
  assertNotStrictEquals(copy.nested, source.nested)
})

Deno.test('Utils - safeClone throws TypeError on non-cloneable input', () => {
  assertThrows(
    () => Utils.safeClone({ fn: () => 1 }),
    TypeError,
    'stateful initial state must be structured cloneable'
  )
})
