import { todo } from "./todo";
import type { Experience } from "./types";

// TODO(content): replace with real roles, most recent first.
export const experience: Experience[] = [
  {
    company: todo("Company"),
    title: todo("Title"),
    start: todo("YYYY-MM"),
    end: "present",
    highlights: [todo("Achievement-first highlight")],
  },
];
