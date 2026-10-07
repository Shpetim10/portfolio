import { todo } from "./todo";
import type { Award } from "./types";

// TODO(content): real awards only. Exactly ONE must be `featured`.
export const awards: Award[] = [
  {
    title: todo("Award title"),
    issuer: todo("Issuer"),
    year: 0, // TODO(content)
    category: "competition", // TODO(content)
    why: todo("What you did to earn it"),
    featured: true,
  },
];
