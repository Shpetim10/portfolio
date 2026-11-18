import type { Experience } from "./types";

// Most recent first.
export const experience: Experience[] = [
  {
    company: "Joint Services",
    logo: { src: "/assets/logos/joint-services.png", width: 181, height: 96 },
    title: "Junior Technical Consultant",
    start: "2026-10",
    end: "present",
    location: "Tirana, Albania",
    // Highlights are added once the role has achievements to report; until then the row lists the stack only.
    highlights: [],
    stack: ["n8n", "LLM", "JEV"],
  },
  {
    company: "Logistiqo",
    logo: { src: "/assets/logos/logistiqo.svg", width: 531.32, height: 101.48 },
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
