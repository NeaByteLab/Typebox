<div align='center'>

# Typebox

Contract language for [TypeScript](https://www.typescriptlang.org) where programs are typed contracts

[![Deno](https://img.shields.io/badge/deno-compatible-ffcb00?logo=deno&logoColor=000000)](https://deno.com) [![JSR](https://jsr.io/badges/@neabyte/typebox)](https://jsr.io/@neabyte/typebox) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## Installation

> [!NOTE]
> **Prerequisites:** Install **Deno** from [deno.com](https://deno.com/).

**Deno (via [JSR](https://jsr.io)):**

```bash
deno add jsr:@neabyte/typebox
```

Or import directly from JSR:

```typescript
import { Define, Loader } from 'jsr:@neabyte/typebox'
```

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

Read [docs/README.md](docs/README.md) for full documentation.

## Testing

**Type check** - format, lint, and type-check:

```bash
deno task check
```

**Unit tests** - format/lint tests and run all tests:

```bash
deno task test
```

- Tests live under `tests/` (globals, utils, helpers, and index tests).
- The test task uses `--allow-read`, `--allow-write`, and `--allow-env`.

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for details.
