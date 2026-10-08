"use client";

import { Button } from "@/components/ui/Button";

/** Opens the browser's print dialog: the print stylesheet sets the sheet on one page. */
export function PrintButton() {
  return (
    <Button variant="secondary" arrow={false} className="resume__print" onClick={() => window.print()}>
      Print
    </Button>
  );
}
