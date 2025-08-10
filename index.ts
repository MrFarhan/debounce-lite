/**
 * Debounce options that control timing semantics and behavior.
 */
export interface DebounceOptions {
  /** Delay in milliseconds. */
  wait: number;
  /** Invoke on the leading edge. Default: false */
  leading?: boolean;
  /** Invoke on the trailing edge. Default: true */
  trailing?: boolean;
  /**
   * Ensure the function runs no later than this many ms since the first call
   * within the current cycle. Ignored if Infinity.
   */
  maxWait?: number;
  /**
   * Deadline strategy:
   * - "extend": classic debounce; deadline moves forward on each call.
   * - "fixedDeadline": first call fixes the deadline; later calls do NOT extend it.
   * Default: "extend".
   */
  strategy?: "extend" | "fixedDeadline";
  /**
   * Optional AbortSignal to cancel a pending invocation when aborted.
   * You can also pass different signals per call (overrides this default).
   */
  signal?: AbortSignal;
}

/**
 * Callable debounced function with control helpers.
 */
export interface DebouncedFunction<TArgs extends any[], TResult> {
  /** Normal call */
  (...args: TArgs): Promise<TResult>;
  /** Optional AbortSignal as the last arg */
  (...args: [...TArgs, { signal?: AbortSignal }]): Promise<TResult>;
  cancel(): void;
  flush(): TResult | undefined;
  pending(): boolean;
}

/**
 * Creates a debounced function supporting classic (extend) and fixed-deadline semantics.
 * - Preserves args/this.
 * - Supports leading/trailing + maxWait.
 * - Returns a promise that resolves with the invoked function’s return value.
 */
export function createDebouncedFunction<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult | Promise<TResult>,
  options: DebounceOptions
): DebouncedFunction<TArgs, TResult> {
  const wait = Math.max(0, options.wait);
  const leading = !!options.leading;
  const trailing = options.trailing !== false; // default true
  const strategy = options.strategy ?? "extend";
  const hasMaxWait = Number.isFinite(options.maxWait ?? Infinity);
  const maxWait = hasMaxWait ? Math.max(0, options.maxWait!) : Infinity;

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let firstCallTime = 0; // start of current cycle
  let lastInvokeTime = 0; // last time fn actually ran
  let pendingArgs: TArgs | null = null;
  let pendingThis: any;
  let pendingResolves: Array<(v: TResult) => void> = [];
  let pendingRejects: Array<(e: unknown) => void> = [];
  let fixedDeadline = 0; // only used when strategy === "fixedDeadline"

  const clearTimer = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const settleAll = (success: boolean, payload: any) => {
    const resolves = pendingResolves;
    const rejects = pendingRejects;
    pendingResolves = [];
    pendingRejects = [];
    if (success) resolves.forEach((r) => r(payload));
    else rejects.forEach((j) => j(payload));
  };

  const invoke = (now: number) => {
    clearTimer();
    const args = pendingArgs!;
    const ctx = pendingThis;
    // Reset pending before calling to avoid reentrancy hazards
    pendingArgs = null;
    pendingThis = null;

    lastInvokeTime = now;
    try {
      const out = fn.apply(ctx, args);
      Promise.resolve(out).then(
        (v) => settleAll(true, v as TResult),
        (e) => settleAll(false, e)
      );
      return out as TResult;
    } catch (e) {
      settleAll(false, e);
      throw e;
    }
  };

  const schedule = (now: number) => {
    clearTimer();

    // Compute remaining time for both wait and maxWait
    let remainingWait: number;
    if (strategy === "extend") {
      // classic debounce → full wait each time
      remainingWait = wait;
    } else {
      // fixed deadline → firstCallTime + wait is the deadline
      remainingWait = Math.max(0, fixedDeadline - now);
    }

    const elapsedSinceFirst = now - firstCallTime;
    const remainingByMax = hasMaxWait
      ? Math.max(0, maxWait - elapsedSinceFirst)
      : Infinity;

    const delay = Math.min(remainingWait, remainingByMax);
    if (delay <= 0) {
      invoke(now);
      return;
    }

    timerId = setTimeout(() => invoke(Date.now()), delay);
  };

  const debounced = function (this: any, ...allArgs: any[]) {
    // Per-call options: last arg may be `{ signal }`
    let callSignal: AbortSignal | undefined;
    if (
      allArgs.length > 0 &&
      allArgs[allArgs.length - 1] &&
      typeof allArgs[allArgs.length - 1] === "object" &&
      !Array.isArray(allArgs[allArgs.length - 1]) &&
      "signal" in (allArgs[allArgs.length - 1] as any)
    ) {
      callSignal = (allArgs.pop() as { signal?: AbortSignal }).signal;
    }

    const now = Date.now();
    const args = allArgs as TArgs;

    const isFirstInCycle = !pendingArgs && !timerId;
    pendingArgs = args;
    pendingThis = this;

    if (isFirstInCycle) {
      firstCallTime = now;
      if (strategy === "fixedDeadline") {
        fixedDeadline = firstCallTime + wait;
      }
    }

    const signal = callSignal ?? options.signal;
    let aborted = false;
    if (signal?.aborted) aborted = true;

    const p = new Promise<TResult>((resolve, reject) => {
      if (aborted) {
        reject(new DOMException("Operation aborted", "AbortError"));
        return;
      }
      pendingResolves.push(resolve);
      pendingRejects.push(reject);

      if (signal) {
        const onAbort = () => {
          // Remove this call’s handlers and reject only once
          const idx = pendingResolves.indexOf(resolve);
          if (idx >= 0) {
            pendingResolves.splice(idx, 1);
            pendingRejects.splice(idx, 1);
            reject(new DOMException("Operation aborted", "AbortError"));
          }
          if (!debounced.pending()) clearTimer();
        };
        // One-shot listener
        const listener = onAbort as EventListener;
        signal.addEventListener("abort", listener, { once: true });
      }
    });

    // Leading edge
    if (isFirstInCycle && leading) {
      const result = invoke(now);
      // If trailing is false, skip scheduling unless new calls come in later
      if (!trailing) return Promise.resolve(result) as Promise<TResult>;
    }

    // Otherwise, schedule trailing (and maxWait/strategy) behavior
    if (trailing) schedule(now);

    return p;
  } as DebouncedFunction<TArgs, TResult>;

  debounced.cancel = () => {
    clearTimer();
    pendingArgs = null;
    pendingThis = null;
    // Reject any waiters because we’re canceling work
    if (pendingRejects.length) {
      settleAll(false, new Error("Debounce canceled"));
    }
  };

  debounced.flush = () => {
    if (!pendingArgs) return undefined;
    return invoke(Date.now());
  };

  debounced.pending = () => !!pendingArgs || !!timerId;

  return debounced;
}

/** Convenience helpers matching your two named variants */
export const debounceExtend = <A extends any[], R>(
  fn: (...args: A) => R | Promise<R>,
  wait: number,
  opts: Omit<DebounceOptions, "wait" | "strategy"> = {}
) => createDebouncedFunction(fn, { ...opts, wait, strategy: "extend" });

export const debounceFixedDeadline = <A extends any[], R>(
  fn: (...args: A) => R | Promise<R>,
  wait: number,
  opts: Omit<DebounceOptions, "wait" | "strategy"> = {}
) => createDebouncedFunction(fn, { ...opts, wait, strategy: "fixedDeadline" });
