import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { debounceExtend, debounceFixedDeadline } from "debounce-lite";
import "./App.css";
import React from "react";

/**
 * Developer-facing demo for `debounce-lite`.
 * - Side-by-side: classic "extend" vs "fixedDeadline".
 * - Live controls: wait, maxWait, leading, trailing.
 * - Actions: Flush / Cancel.
 * - Realtime indicators: pending state, call counts, last payload.
 */
export default function App(): JSX.Element {
  // --- Controls --------------------------------------------------------------

  /** Delay in milliseconds for both debouncers. */
  const [waitMs, setWaitMs] = useState<number>(300);
  /** Max time since first call within a cycle before forced invoke. */
  const [maxWaitMs, setMaxWaitMs] = useState<number>(2000);
  /** Invoke on the leading edge. */
  const [leading, setLeading] = useState<boolean>(false);
  /** Invoke on the trailing edge. */
  const [trailing, setTrailing] = useState<boolean>(true);

  // --- Demo state ------------------------------------------------------------

  const [extendCallCount, setExtendCallCount] = useState<number>(0);
  const [fixedCallCount, setFixedCallCount] = useState<number>(0);

  const [extendLast, setExtendLast] = useState<string>("-");
  const [fixedLast, setFixedLast] = useState<string>("-");

  const [log, setLog] = useState<string[]>([]);

  // Keep stable handlers; debouncers will call these.
  const onExtendInvoke = useCallback((value: string) => {
    setExtendCallCount((n) => n + 1);
    setExtendLast(value);
    appendLog(`EXTEND invoked → "${value}"`);
  }, []);

  const onFixedInvoke = useCallback((value: string) => {
    setFixedCallCount((n) => n + 1);
    setFixedLast(value);
    appendLog(`FIXED invoked  → "${value}"`);
  }, []);

  // Helper to prepend to the event log.
  const appendLog = useCallback((entry: string) => {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => [`[${stamp}] ${entry}`, ...prev].slice(0, 60));
  }, []);

  // --- Debounced functions (recreated on option changes) --------------------

  const extendDebounced = useMemo(() => {
    return debounceExtend((v: string) => onExtendInvoke(v), waitMs, {
      leading,
      trailing,
      maxWait: Number.isFinite(maxWaitMs) ? maxWaitMs : undefined,
    });
  }, [onExtendInvoke, waitMs, leading, trailing, maxWaitMs]);

  const fixedDebounced = useMemo(() => {
    return debounceFixedDeadline((v: string) => onFixedInvoke(v), waitMs, {
      leading,
      trailing,
      maxWait: Number.isFinite(maxWaitMs) ? maxWaitMs : undefined,
    });
  }, [onFixedInvoke, waitMs, leading, trailing, maxWaitMs]);

  // Track "pending" state by polling lightly (for display only).
  const [extendPending, setExtendPending] = useState<boolean>(false);
  const [fixedPending, setFixedPending] = useState<boolean>(false);

  useEffect(() => {
    const id = setInterval(() => {
      setExtendPending(extendDebounced.pending());
      setFixedPending(fixedDebounced.pending());
    }, 100);
    return () => clearInterval(id);
  }, [extendDebounced, fixedDebounced]);

  // Input binding (single source of truth for both fields to compare behavior).
  const inputRef = useRef<HTMLInputElement>(null);

  /** Push a keystroke value to both debouncers. */
  const handleChange = (value: string) => {
    extendDebounced(value);
    fixedDebounced(value);
  };

  // --- Render ---------------------------------------------------------------

  return (
    <div className="dlite-app">
      <header className="dlite-header">
        <h1 className="dlite-title">debounce-lite Playground</h1>
        <p className="dlite-subtitle">
          Compare <strong>extend</strong> vs <strong>fixedDeadline</strong>{" "}
          strategies in real time.
        </p>
      </header>

      <section className="dlite-controls">
        <div className="dlite-control">
          <label htmlFor="wait">Wait (ms)</label>
          <input
            id="wait"
            type="range"
            min={0}
            max={1500}
            step={50}
            value={waitMs}
            onChange={(e) => setWaitMs(Number(e.target.value))}
          />
          <span className="dlite-badge">{waitMs} ms</span>
        </div>

        <div className="dlite-control">
          <label htmlFor="maxwait">maxWait (ms)</label>
          <input
            id="maxwait"
            type="range"
            min={0}
            max={5000}
            step={100}
            value={maxWaitMs}
            onChange={(e) => setMaxWaitMs(Number(e.target.value))}
          />
          <span className="dlite-badge">
            {maxWaitMs === Infinity ? "∞" : `${maxWaitMs} ms`}
          </span>
        </div>

        <div className="dlite-switches">
          <label className="dlite-switch">
            <input
              type="checkbox"
              checked={leading}
              onChange={(e) => setLeading(e.target.checked)}
            />
            <span>leading</span>
          </label>

          <label className="dlite-switch">
            <input
              type="checkbox"
              checked={trailing}
              onChange={(e) => setTrailing(e.target.checked)}
            />
            <span>trailing</span>
          </label>
        </div>
      </section>

      <section className="dlite-input">
        <label htmlFor="demo-input">Type to simulate user input</label>
        <input
          id="demo-input"
          ref={inputRef}
          placeholder="Start typing… (updates feed both debouncers)"
          onChange={(e) => handleChange(e.target.value)}
        />
        <div className="dlite-actions">
          <button
            className="dlite-btn"
            onClick={() => {
              const v = inputRef.current?.value ?? "";
              extendDebounced.flush();
              appendLog(`EXTEND flush requested for "${v}"`);
            }}
          >
            Flush EXTEND
          </button>
          <button
            className="dlite-btn"
            onClick={() => {
              const v = inputRef.current?.value ?? "";
              fixedDebounced.flush();
              appendLog(`FIXED flush requested for "${v}"`);
            }}
          >
            Flush FIXED
          </button>
          <button
            className="dlite-btn ghost"
            onClick={() => {
              extendDebounced.cancel();
              fixedDebounced.cancel();
              appendLog("Canceled all pending work");
            }}
          >
            Cancel All
          </button>
        </div>
      </section>

      <section className="dlite-grid">
        <StrategyCard
          title="Extend Strategy"
          description="Resets the wait timer on every call (classic debounce)."
          pending={extendPending}
          count={extendCallCount}
          last={extendLast}
          accent="extend"
        />

        <StrategyCard
          title="Fixed-deadline Strategy"
          description="First call sets a fixed deadline; later calls do not extend it."
          pending={fixedPending}
          count={fixedCallCount}
          last={fixedLast}
          accent="fixed"
        />
      </section>

      <section className="dlite-log">
        <h3>Event Log</h3>
        <ul>
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>

      <footer className="dlite-footer">
        <span>
          Tip: toggle <code>leading</code>/<code>trailing</code> and type
          quickly to see the differences.
        </span>
      </footer>
    </div>
  );
}

/** Props for the per-strategy status card. */
interface StrategyCardProps {
  title: string;
  description: string;
  pending: boolean;
  count: number;
  last: string;
  accent: "extend" | "fixed";
}

/** Visual card showing live state for one strategy. */
function StrategyCard(props: StrategyCardProps): JSX.Element {
  const { title, description, pending, count, last, accent } = props;
  return (
    <article className={`dlite-card ${accent}`}>
      <header className="dlite-card-header">
        <h2>{title}</h2>
        <span className={`dlite-chip ${pending ? "on" : "off"}`}>
          {pending ? "Pending…" : "Idle"}
        </span>
      </header>
      <p className="dlite-desc">{description}</p>
      <div className="dlite-stats">
        <div>
          <div className="dlite-stat-label">Invocations</div>
          <div className="dlite-stat-value">{count}</div>
        </div>
        <div>
          <div className="dlite-stat-label">Last payload</div>
          <div className="dlite-stat-value monospace">{last}</div>
        </div>
      </div>
    </article>
  );
}
