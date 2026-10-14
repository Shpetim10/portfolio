import { todo } from "./todo";
import type { Experience } from "./types";

// Most recent first.
export const experience: Experience[] = [
  {
    company: "Joint Services",
    title: "Junior Technical Consultant",
    start: "2026-10",
    end: "present",
    location: "Tirana, Albania",
    // TODO(content): the intake has no duties for this role yet; 2–3 achievement-first highlights needed.
    highlights: [todo("Achievement-first highlight"), todo("Achievement-first highlight")],
    stack: ["n8n", "LLM", "JEV"],
  },
  {
    company: "Logistiqo",
    title: "Junior Java Developer",
    start: "2025-08",
    end: "2026-06",
    location: "Tirana, Albania · Hybrid, part-time",
    highlights: [
      "Migrated application screens from JSF/PrimeFaces to a modern React frontend, modernizing enterprise logistics software used by real customers.",
      "Built Java EE APIs and integrated them with React components to deliver customer-requested features.",
      "Diagnosed and fixed production bugs reported by customers, improving the software's day-to-day reliability.",
    ],
    stack: ["Java EE", "React", "JSF", "PrimeFaces", "REST", "Git"],
  },
];
