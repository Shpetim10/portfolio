import type { Education } from "./types";

// Exactly ONE entry is `featured`. Distinctions are short tags; the stories behind
// them live in awards.ts and are linked by `awardId`. Certifications stay in awards.ts.
// `confirm` lists dates the owner has not confirmed yet: dev builds mark them TODO.
export const education: Education[] = [
  {
    id: "holberton",
    institution: "Holberton School Albania",
    location: "Tirana, Albania",
    credential: "Machine Learning Specialization",
    start: "2026-09",
    end: "present",
    status: "in-progress",
    distinctions: [],
    coursework: ["Core machine learning", "Deep learning", "AI agents", "Generative AI"],
    featured: false,
  },
  {
    id: "epoka",
    institution: "Epoka University",
    location: "Tirana, Albania",
    credential: "B.Sc. Software Engineering",
    start: "2023-10",
    end: "2026-06",
    status: "completed",
    grade: { value: 4.0, scaleMin: 0, scaleMax: 4, label: "GPA" },
    distinctions: [
      { label: "Rank #1 in program", awardId: "first-ranked-graduate" },
      { label: "High Honors" },
    ],
    // The brief named these "beloyal" and "worknest": the projects were published as Ritema and WorkTrezz.
    relatedProjects: ["ritema", "garbage-classifier", "worktrezz", "library-management-system"],
    featured: true,
  },
  {
    id: "high-school",
    institution: "Gjimnazi Babë Dudë Karbunara",
    location: "Berat, Albania",
    credential: "High School Diploma",
    start: "2020-09",
    end: "2023-06",
    status: "completed",
    grade: { value: 9.94, scaleMin: 0, scaleMax: 10, label: "Average" },
    distinctions: [{ label: "Prime Minister's Gold Medal", awardId: "pm-gold-medal" }],
    featured: false,
  },
];
