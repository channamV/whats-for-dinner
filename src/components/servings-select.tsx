"use client";

import { useRef, useState } from "react";
import { LISTED_SERVINGS, MAX_SERVINGS } from "@/lib/servings";

const MORE = "more";

/**
 * Table size: a list of 1–12, plus "More…" which swaps to a number box for bigger groups.
 * Use `name` inside a form, or `onChange` to react straight away.
 */
export function ServingsSelect({
  defaultValue,
  name,
  onChange,
  prefix = "",
  className = "",
  ariaLabel = "Number of people",
}: {
  defaultValue: number;
  name?: string;
  onChange?: (n: number) => void;
  prefix?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [more, setMore] = useState(defaultValue > LISTED_SERVINGS.length);
  const [typed, setTyped] = useState(String(defaultValue > LISTED_SERVINGS.length ? defaultValue : ""));
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(n: number) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_SERVINGS) return;
    setValue(n);
    if (n !== value) onChange?.(n);
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      {more ? (
        <>
          {prefix && <span className="text-sm text-muted">{prefix.trim()}</span>}
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_SERVINGS}
            value={typed}
            placeholder="13+"
            aria-label={ariaLabel}
            className="input w-20 py-1.5 text-sm"
            onChange={(e) => {
              setTyped(e.target.value);
              // In a form, keep the hidden value current as you type; with onChange, wait until done.
              if (name && !onChange) commit(Number(e.target.value));
            }}
            onBlur={() => commit(Number(typed))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onChange) {
                e.preventDefault();
                commit(Number(typed));
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost px-1.5 py-1 text-xs"
            onClick={() => {
              setMore(false);
              if (value > LISTED_SERVINGS.length) commit(LISTED_SERVINGS.length);
            }}
            aria-label="Back to the list"
            title="Back to the list"
          >
            ✕
          </button>
        </>
      ) : (
        <select
          value={value}
          aria-label={ariaLabel}
          className="input w-auto py-1.5 pr-7 text-sm"
          onChange={(e) => {
            if (e.target.value === MORE) {
              setMore(true);
              setTyped("");
              setTimeout(() => inputRef.current?.focus(), 0);
              return;
            }
            commit(Number(e.target.value));
          }}
        >
          {LISTED_SERVINGS.map((n) => (
            <option key={n} value={n}>
              {prefix}
              {n}
            </option>
          ))}
          <option value={MORE}>More…</option>
        </select>
      )}
    </span>
  );
}
