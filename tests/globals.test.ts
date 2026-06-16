import { assertEquals } from '@std/assert'
import Globals from '@app/globals.ts'

Deno.test('Globals - maxGuardInputLength is 10000', () => {
  assertEquals(Globals.maxGuardInputLength, 10000)
})

Deno.test('Globals - statefulMark is a unique symbol', () => {
  assertEquals(typeof Globals.statefulMark, 'symbol')
  assertEquals(Globals.statefulMark.description, 'typebox.stateful')
})

Deno.test('Globals - statefulMark is stable across reads', () => {
  assertEquals(Globals.statefulMark, Globals.statefulMark)
})
