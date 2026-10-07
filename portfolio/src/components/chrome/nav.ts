import type { Layer } from "@/content/types";

/*
 * Site index for the menu (T02). Each homepage section is filed under one part
 * of the Instrument; the menu numbers its links with that part's P/N and draws
 * the part's outline when the link is hovered or focused.
 * Section ids are the anchors the homepage sections (T04–T13) render.
 */

export const LAYER_NAMES: Record<Layer, string> = {
  interface: "Interface",
  api: "API",
  services: "Services",
  data: "Data",
  infrastructure: "Infrastructure",
};

/** Assembly order, top plate first. P/N = position + 1. */
export const LAYERS: Layer[] = ["interface", "api", "services", "data", "infrastructure"];

export const partNumber = (layer: Layer) => `P/N ${String(LAYERS.indexOf(layer) + 1).padStart(2, "0")}`;

export type NavItem = { label: string; href: string; layer: Layer };

export const NAV: NavItem[] = [
  { label: "Work", href: "/#work", layer: "interface" },
  { label: "Stack", href: "/#stack", layer: "api" },
  { label: "Experience", href: "/#experience", layer: "services" },
  { label: "Awards", href: "/#awards", layer: "data" },
  { label: "Contact", href: "/#contact", layer: "infrastructure" },
];
