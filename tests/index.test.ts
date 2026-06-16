import { assertEquals, assertStrictEquals, assertThrows } from '@std/assert'
import { Define, Loader } from '@neabyte/typebox'

Deno.test('Define - attaches a guard that can reject', () => {
  const signup = Define(
    (props: { age: number }) => props,
    (props) => (props.age >= 18 ? true : 'age must be at least 18')
  )
  assertThrows(() => signup({ age: 12 } as never), TypeError, 'age must be at least 18')
})

Deno.test('Define - builds a data contract with no meaningful input', () => {
  const version = Define(() => 1)
  assertEquals((version as () => number)(), 1)
})

Deno.test('Define - builds a plain operation contract', () => {
  const add = Define((props: { a: number; b: number }) => props.a + props.b)
  assertEquals(add({ a: 2, b: 3 } as never), 5)
})

Deno.test('Define - returns the same function when no guard is given', () => {
  const contract = (props: { n: number }): number => props.n
  const built = Define(contract)
  assertStrictEquals(built, contract)
})

Deno.test('Define.state - builds a stateful contract entry', () => {
  const counter = Define.state(0, (count, amount: number) => count + amount)
  assertEquals(typeof counter, 'object')
})

Deno.test('Loader - gives each load independent state', () => {
  const blueprint = {
    counter: Define.state(0, (count, amount: number) => count + amount)
  }
  const first = Loader(blueprint)
  const second = Loader(blueprint)
  first.counter(5)
  assertEquals(first.counter.get(), 5)
  assertEquals(second.counter.get(), 0)
})

Deno.test('Loader - keeps a plain contract callable', () => {
  const app = Loader({
    add: Define((props: { a: number; b: number }) => props.a + props.b)
  })
  assertEquals(app.add({ a: 4, b: 6 }), 10)
})

Deno.test('Loader - reads object state immutably after transitions', () => {
  const app = Loader({
    cart: Define.state(
      { items: 0, total: 0 },
      (state, price: number) => ({ items: state.items + 1, total: state.total + price })
    )
  })
  app.cart(100)
  app.cart(250)
  assertEquals(app.cart.get(), { items: 2, total: 350 })
  assertEquals(Object.isFrozen(app.cart.get()), true)
})

Deno.test('Loader - skips entries whose value is undefined', () => {
  const app = Loader({
    present: Define(() => 'here'),
    absent: undefined as unknown as ReturnType<typeof Define>
  })
  assertEquals('absent' in app, false)
  assertEquals((app.present as () => string)(), 'here')
})

Deno.test('Loader - supports a one-argument step with no payload', () => {
  const app = Loader({
    ticks: Define.state(0, (count) => count + 1)
  })
  assertEquals(app.ticks(), 1)
  assertEquals(app.ticks(), 2)
})

Deno.test('Loader - throws from inside a step without wrapping the error', () => {
  const app = Loader({
    safe: Define.state(10, (count, amount: number) => {
      if (amount < 0) {
        throw new Error('no negatives')
      }
      return count + amount
    })
  })
  app.safe(5)
  const error = assertThrows(() => app.safe(-1), Error, 'no negatives')
  assertEquals((error as Error).cause, undefined)
  assertEquals(app.safe.get(), 15)
})

Deno.test('Loader - turns a stateful contract into a StateHandle', () => {
  const app = Loader({
    counter: Define.state(0, (count, amount: number) => count + amount)
  })
  assertEquals(app.counter.get(), 0)
  assertEquals(app.counter(5), 5)
  assertEquals(app.counter(2), 7)
  assertEquals(app.counter.get(), 7)
})

Deno.test('Loader - unwraps an async contract output with one await', async () => {
  const app = Loader({
    fetchUser: Define(async (props: { id: number }) => {
      await Promise.resolve()
      return { id: props.id, name: 'neo' }
    })
  })
  assertEquals(await app.fetchUser({ id: 7 }), { id: 7, name: 'neo' })
})

Deno.test('Loader - validation guard reasons surface on cause', () => {
  const app = Loader({
    create: Define(
      (props: { name: string }) => props,
      (props) => (props.name.length > 0 ? true : 'name required')
    )
  })
  const error = assertThrows(() => app.create({ name: '' }), TypeError, 'name required')
  assertEquals((error as Error).cause, ['name required'])
})
