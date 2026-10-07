"use client";

import { gsap } from "./gsap";

/*
 * Mono label decode for ANNOTATE: characters resolve left → right out of a
 * scramble. Mono labels only (every glyph has the same advance, so swapping
 * characters never reflows). Works on text nodes, so nested markup survives.
 */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
// Only letters and digits scramble; spaces and punctuation (— / : .) hold the label's shape.
const SCRAMBLES = /[\p{L}\p{N}]/u;

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

export type Decoder = {
  /** Paints the label fully scrambled (the state before the decode runs). */
  scramble: () => void;
  /** A tween that decodes the label over `duration` seconds. */
  tween: (duration: number) => gsap.core.Tween;
  /** Writes the original text back. Call on revert. */
  restore: () => void;
};

export function createDecoder(element: Element): Decoder {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  const originals = nodes.map((node) => node.data);
  const total = originals.reduce((sum, text) => sum + text.length, 0);

  // Everything before `resolved` (a character index across all nodes) is final.
  const paint = (resolved: number) => {
    let offset = 0;
    nodes.forEach((node, i) => {
      const original = originals[i];
      let next = "";
      for (let c = 0; c < original.length; c++) {
        const char = original[c];
        next += offset + c < resolved || !SCRAMBLES.test(char) ? char : randomGlyph();
      }
      if (node.data !== next) node.data = next;
      offset += original.length;
    });
  };

  return {
    scramble: () => paint(0),
    tween: (duration) => {
      const state = { resolved: 0 };
      return gsap.to(state, {
        resolved: total,
        duration,
        ease: "none",
        onUpdate: () => paint(Math.floor(state.resolved)),
        onComplete: () => paint(total),
      });
    },
    restore: () => {
      nodes.forEach((node, i) => {
        node.data = originals[i];
      });
    },
  };
}
