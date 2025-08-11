# debounce-lite

Dual-strategy debounce for modern apps — classic **extend** debounce *and* a unique **fixedDeadline** mode.  
TypeScript-first, zero deps, tiny, and production-ready.

> **Why?** Most debouncers only “extend the deadline.” `debounce-lite` also supports a **fixed deadline**: the first call starts a timer that **won’t** be pushed out by subsequent calls — perfect when you want predictable latency.

---

## Features
- **Two strategies:** `extend` (classic) and `fixedDeadline` (first call sets deadline)
- **Controls:** `leading`, `trailing`, `maxWait`, `cancel()`, `flush()`, `pending()`
- **Great DX:** TS types, JSDoc, argument & `this` preservation, optional `AbortSignal`
- **Zero dependencies** • **Tiny** • **CJS build** (works everywhere)

---
## Live Demo
Try it here: https://debounce-lite.surge.sh

---

## Install
```bash
npm i debounce-lite
# pnpm add debounce-lite
# yarn add debounce-lite
```

---

## Quick start

### Extend (classic) debounce
```ts
import { debounceExtend } from "debounce-lite";

const save = (q: string) => api.save(q);

const debouncedSave = debounceExtend(save, 300, {
  trailing: true,
  leading: false,
  maxWait: 2000,
});

input.addEventListener("input", (e) => debouncedSave((e.target as HTMLInputElement).value));
```

### Fixed-deadline debounce (the differentiator)
```ts
import { debounceFixedDeadline } from "debounce-lite";

// First call starts a 300ms deadline; later calls DON'T extend it.
const stableLatencySave = debounceFixedDeadline(save, 300);

input.addEventListener("input", (e) => stableLatencySave((e.target as HTMLInputElement).value));
```

### React demo
See the playground in [`examples/react`](./examples/react). It shows both strategies, live controls, and a log.

---

## API

### `createDebouncedFunction(fn, options) → DebouncedFunction`
Build your own with full control.

**Options**
| Name | Type | Default | Description |
|---|---|---:|---|
| `wait` | `number` | — | Delay in ms. |
| `leading` | `boolean` | `false` | Invoke on the leading edge. |
| `trailing` | `boolean` | `true` | Invoke on the trailing edge. |
| `maxWait` | `number` | `Infinity` | Ensures an invoke no later than this many ms since the first call of the cycle. |
| `strategy` | `"extend" \| "fixedDeadline"` | `"extend"` | Deadline behavior (see below). |

**Returns** a debounced function with:
- `(...args): Promise<TResult>`
- `(...args, { signal?: AbortSignal }): Promise<TResult>` *(optional per-call AbortSignal)*
- `.cancel(): void`
- `.flush(): TResult | undefined`
- `.pending(): boolean`

### Convenience helpers
- `debounceExtend(fn, wait, opts?)` — classic debounce
- `debounceFixedDeadline(fn, wait, opts?)` — fixed deadline

**Type signatures**
```ts
export interface DebounceOptions {
  wait: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
  strategy?: "extend" | "fixedDeadline";
}

export interface DebouncedFunction<TArgs extends any[], TResult> {
  (...args: TArgs): Promise<TResult>;
  (...args: [...TArgs, { signal?: AbortSignal }]): Promise<TResult>;
  cancel(): void;
  flush(): TResult | undefined;
  pending(): boolean;
}
```

---

## Strategy semantics (at a glance)

- **extend (classic):** each call **resets** the `wait` timer  
  `a──┐ b──┐ c──┐       |invoke c|`
- **fixedDeadline:** first call fixes the deadline; later calls **don’t** move it  
  `a────────────|deadline| (invokes with latest args seen before deadline)`

Use **extend** to reduce call volume while users type; use **fixedDeadline** when you need **stable latency** (e.g., “always respond ~300ms after first keystroke, regardless of flurries”).

---

## Recipes

**Cancel pending work**
```ts
const d = debounceExtend(save, 300);
router.beforeEach(() => d.cancel());
```

**Flush immediately (e.g., on blur)**
```ts
input.addEventListener("blur", () => void d.flush());
```

**Abort per call**
```ts
const ctrl = new AbortController();
d(query, { signal: ctrl.signal });
ctrl.abort(); // rejects that call's promise with AbortError
```

---

## Common questions

**How is this different from throttle?**  
Throttle limits call **rate**; debounce delays **until quiet** (or deadline). `fixedDeadline` is still a debounce—just with a stable end time.

**Does it work with CommonJS and ESM?**  
Yes. Package ships CJS with types. Import via `import { … } from "debounce-lite"` (bundlers/TS) or `const { … } = require("debounce-lite")`.

---

## License
MIT © MrFarhan

---

## Changelog
See Git commits. Initial public release adds both strategies, controls, React example, and tests.
