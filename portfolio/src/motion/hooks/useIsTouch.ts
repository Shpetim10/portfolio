"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * True when the primary input cannot hover or is coarse (phones, tablets).
 * Gates the custom cursor, magnetic pull and any hover-revealed content.
 */
export const useIsTouch = (): boolean => useMediaQuery("(hover: none), (pointer: coarse)");
