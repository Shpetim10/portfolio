"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

/**
 * Remounts its children so a one-shot motion plays again. Each replay is a
 * full unmount → mount, which is also a cheap manual leak check.
 */
export function Replay({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [run, setRun] = useState(0);
  return (
    <>
      <Fragment key={run}>{children}</Fragment>
      <div className={cx("col-span-full", className)}>
        <Button variant="secondary" arrow={false} onClick={() => setRun((n) => n + 1)} data-replay={label}>
          Replay {label}
        </Button>
      </div>
    </>
  );
}
