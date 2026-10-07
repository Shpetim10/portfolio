"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Content } from "@/components/ui/Content";
import { cx } from "@/components/ui/cx";
import type { Profile } from "@/content/types";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

/*
 * Live status line: availability dot + note, then the owner's local time.
 * The clock is idle motion: it ticks every second; under reduced motion it
 * shows HH:MM and changes once a minute. It is never announced (no aria-live).
 * Before hydration (static HTML) the time reads "--:--:--" at the same width.
 */

type StatusProps = {
  availability: Profile["availability"];
  timezone: string;
  className?: string;
};

export function Status({ availability, timezone, className }: StatusProps) {
  return (
    <p className={cx("status", className)}>
      <span className="status__availability">
        <span className="status__dot" data-open={availability.open} aria-hidden="true" />
        <span className="sr-only">{availability.open ? "Available." : "Not currently available."} </span>
        <Content value={availability.note} />
      </span>
      <span className="status__rule" aria-hidden="true" />
      <LocalTime timezone={timezone} />
    </p>
  );
}

const PLACEHOLDER = "--:--:--";

/** Re-renders on every `step` boundary of the wall clock. */
function useWallClock(step: number): number | null {
  const subscribe = useCallback(
    (onTick: () => void) => {
      let id = 0;
      const schedule = () => {
        id = window.setTimeout(
          () => {
            onTick();
            schedule();
          },
          step - (Date.now() % step),
        );
      };
      schedule();
      return () => window.clearTimeout(id);
    },
    [step],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / step),
    () => null,
  );
}

function LocalTime({ timezone }: { timezone: string }) {
  const reduced = useReducedMotion();
  const step = reduced ? 60_000 : 1_000;
  const tick = useWallClock(step);

  const format = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: reduced ? undefined : "2-digit",
        hourCycle: "h23",
        timeZoneName: "short",
      });
    } catch {
      return null; // Unknown IANA zone: keep the placeholder rather than show a wrong time.
    }
  }, [timezone, reduced]);

  let time = PLACEHOLDER;
  let zone = "";
  if (tick !== null && format) {
    const parts = format.formatToParts(tick * step);
    zone = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    time = parts
      .filter((part) => part.type !== "timeZoneName")
      .map((part) => part.value)
      .join("")
      .trim();
  }

  return (
    <span className="status__time">
      <span className="sr-only">Local time </span>
      <span className="status__clock" data-clock="">
        {time}
      </span>
      <span className="status__zone">{zone}</span>
    </span>
  );
}
