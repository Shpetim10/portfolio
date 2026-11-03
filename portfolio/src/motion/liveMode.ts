/*
 * Pre-paint "live" mode for stages whose full-motion layout or initial states
 * differ from the static page (the work track, the work index).
 *
 * The inline script runs before first paint, so full motion gets its live CSS
 * at once and nothing flashes or shifts on hydration. But it runs even when the
 * app's JavaScript then never does (a blocked or failed chunk, a dev server
 * reached from an origin it refuses, a very slow phone connection), and live CSS
 * without the motion code leaves content hidden or the track frozen. So the
 * script also arms a failsafe: unless the stage has marked itself ready
 * (markLive) within LIVE_FAILSAFE_MS, it drops back to the static page, which
 * is complete on its own. If the app hydrates later, the stage goes live then.
 */

/** How long the pre-paint script waits for the stage's code before showing the static page. */
export const LIVE_FAILSAFE_MS = 3000;

/** Inline script body: sets data-mode="live" on its parent (full motion only), with the failsafe. */
export const LIVE_MODE_SCRIPT = `try{var e=document.currentScript.parentElement;if(!matchMedia("(prefers-reduced-motion: reduce)").matches){e.dataset.mode="live";setTimeout(function(){if(!("ready" in e.dataset))delete e.dataset.mode},${LIVE_FAILSAFE_MS})}}catch(x){}`;

/** Called by the stage once its motion code runs: disarms the failsafe. */
export const markReady = (root: HTMLElement) => {
  root.dataset.ready = "";
};
