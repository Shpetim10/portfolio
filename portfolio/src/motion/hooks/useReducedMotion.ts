"use client";

import { useMediaQuery } from "./useMediaQuery";

/** True when the OS asks for reduced motion. Updates live when the setting changes. */
export const useReducedMotion = (): boolean => useMediaQuery("(prefers-reduced-motion: reduce)");
