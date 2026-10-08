"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/Button";

/*
 * Copies the address. The label confirms in mono ("COPIED ✓") for a moment,
 * then returns; the same news is announced once through a polite live region.
 * Without the Clipboard API (or permission) it says so and selects the address
 * for a manual copy. Without JS the button is hidden: the address is a mailto link.
 */

type State = "idle" | "copied" | "failed";

const LABEL: Record<State, string> = { idle: "Copy", copied: "Copied ✓", failed: "Select + copy" };
const ANNOUNCE: Record<State, string> = {
  idle: "",
  copied: "Email address copied to the clipboard.",
  failed: "Couldn't copy. The address is selected: copy it from there.",
};
/** How long the confirmation holds before the label returns. */
const HOLD = 2400;

export function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const settle = (next: State) => {
    setState(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), HOLD);
  };

  const copy = async (event: MouseEvent<HTMLButtonElement>) => {
    const address = event.currentTarget.parentElement?.querySelector(".contact__address");
    try {
      await navigator.clipboard.writeText(email);
      settle("copied");
    } catch {
      if (address) window.getSelection()?.selectAllChildren(address);
      settle("failed");
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        arrow={false}
        className="contact__copy"
        data-state={state}
        data-contact="copy"
        aria-label={`Copy email address ${email}`}
        onClick={copy}
      >
        <span aria-hidden="true">{LABEL[state]}</span>
      </Button>
      <span className="sr-only" role="status">
        {ANNOUNCE[state]}
      </span>
    </>
  );
}
