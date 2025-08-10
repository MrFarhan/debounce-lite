/// <reference types="vitest" />

import { describe, it, expect, vi } from "vitest";
import { debounceExtend, debounceFixedDeadline } from "../dist/index.js";

describe("debounce-lite", () => {
  it("extend debounces trailing", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounceExtend((v: string) => fn(v), 50);

    d("a");
    d("b");
    d("c");
    vi.advanceTimersByTime(49);
    expect(fn).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith("c");
    vi.useRealTimers();
  });

  it("fixedDeadline uses first deadline", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounceFixedDeadline((v: string) => fn(v), 80);

    d("1");
    vi.advanceTimersByTime(40);
    d("2"); // should NOT extend deadline
    vi.advanceTimersByTime(40);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith("2");
    vi.useRealTimers();
  });
});
