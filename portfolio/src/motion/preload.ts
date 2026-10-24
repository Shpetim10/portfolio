"use client";

/*
 * Preload registry for the first-visit preloader (T01).
 * The CALIBRATING readout counts against real work, not a fake timer:
 *   fonts      every FontFace still loading at start, plus document.fonts.ready
 *   posters    every <img data-preload> in the document (the hero poster)
 *   tracked    anything handed to trackPreload() — e.g. the 3D chunk request:
 *              `trackPreload(import("@/components/three/Scene"))`
 * Tasks only ever add progress; failures count as done (the preloader must
 * never wait on a broken asset). The preloader caps its own wait regardless.
 */

/** sessionStorage key: set once the preloader has run in this tab session. */
export const PRELOADER_FLAG = "ev:calibrated";

const tracked = new Set<Promise<unknown>>();
const trackListeners = new Set<(task: Promise<unknown>) => void>();

/** Registers async work the preloader should wait for (bounded by its cap). */
export function trackPreload<T>(task: Promise<T>): Promise<T> {
  tracked.add(task);
  trackListeners.forEach((listener) => listener(task));
  return task;
}

/**
 * Collects every preload task present now and reports each one settling.
 * Tasks tracked later are picked up too, until the returned `stop` runs.
 */
export function watchPreload(onChange: (done: number, total: number) => void) {
  let done = 0;
  let total = 0;
  let live = true;
  const add = (task: Promise<unknown>) => {
    total += 1;
    const settle = () => {
      if (!live) return;
      done += 1;
      onChange(done, total);
    };
    task.then(settle, settle);
  };

  for (const face of document.fonts) {
    if (face.status === "loading") add(face.loaded);
  }
  add(document.fonts.ready);
  for (const image of document.querySelectorAll<HTMLImageElement>("img[data-preload]")) {
    add(image.complete ? Promise.resolve() : image.decode());
  }
  tracked.forEach(add);
  trackListeners.add(add);
  onChange(done, total);

  return () => {
    live = false;
    trackListeners.delete(add);
  };
}

/*
 * Intro gate. Resolves the moment the preloader stops blocking (its exit starts),
 * or straight away when it is skipped (repeat visit, JS late past the cap).
 * The value says whether the preloader played: the header's logo draws on
 * only after it (BRAND-01), i.e. on the first load of a tab session.
 * Hero choreography (T03) awaits this before starting its entrance.
 */
let releaseIntroGate: (played: boolean) => void = () => {};
export const introReady =
  typeof window === "undefined"
    ? Promise.resolve(false)
    : new Promise<boolean>((resolve) => {
        releaseIntroGate = resolve;
      });

/** Opens the intro gate; only the first call counts. `played`: the preloader ran its exit. */
export const releaseIntro = (played = false) => {
  document.documentElement.dataset.preloader = "done";
  releaseIntroGate(played);
};
