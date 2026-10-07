import type { Layer } from "@/content/types";

/**
 * One plain-language line per part of the Instrument, shown when the hero
 * explodes it. Site copy about the concept itself — not facts about the owner.
 */
export const PART_NOTES: Record<Layer, string> = {
  interface: "What people touch",
  api: "How the parts talk",
  services: "Where the work happens",
  data: "What the system remembers",
  infrastructure: "What keeps it running",
};
