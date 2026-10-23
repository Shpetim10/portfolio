import type { Metric, Profile } from "./types";

export const profile: Profile = {
  name: "Shpëtim Shabanaj",
  role: "Software Engineer",
  positioning:
    "Top-ranked software engineer uniting rigorous engineering and AI to build exceptional systems.",
  manifesto:
    "Excellence is not an occasional goal for me; it is the standard I apply to every line of code. The Prime Minister of Albania awarded me a Gold Medal for high school excellence, and I graduated first in Software Engineering at Epoka University with a perfect 4.0 GPA. I believe great AI starts with great software engineering, so I unite the two: rigorous architecture, testing and scalability, combined with systems that learn and adapt. My ambition is to build technology that delivers real impact and helps shape a brighter future.",
  location: "Tiranë, Albania",
  timezone: "Europe/Tirane",
  availability: { open: false, note: "Working as Junior Technical Consultant at Joint Services IT" },
  email: "shpetim.shabanaj1@gmail.com",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/shpetimshabanaj" },
    { label: "GitHub", href: "https://github.com/Shpetim10" },
  ],
  // The static PDF served from /public (the owner's real Europass CV); /resume displays it as written.
  resumeUrl: "/resume.pdf",
  portrait: {
    src: "/assets/shpetim-professional-profile.png",
    alt: "Portrait of Shpëtim Shabanaj",
    width: 1122,
    height: 1402,
    kind: "image",
  },
  // The signature plaque under the manifesto (T04c). Figures as stated by the owner, Oct 2026.
  tenure: [
    {
      value: 1,
      suffix: "YR",
      label: "Industry experience",
      source: "Owner, Oct 2026: Logistiqo, Aug 2025 to Jun 2026; Joint Services since Oct 2026",
    },
    {
      value: 4,
      suffix: "YRS",
      label: "Field involvement",
      source: "Owner, Oct 2026",
    },
  ],
};

// The first is the lead metric (T05). Every figure has a verifiable `source`.
export const metrics: Metric[] = [
  {
    value: 4,
    suffix: "GPA",
    label: "Perfect GPA, B.Sc. Software Engineering",
    source: "Epoka University diploma, final grade 4.0/4.0, June 2026",
  },
  {
    value: 1,
    suffix: "ST",
    label: "Ranked first in the Software Engineering program",
    source: "Epoka University First Rank Award and Plaque Award, 25 June 2026",
  },
  {
    value: 9.94,
    suffix: "/10",
    label: "High school average, Prime Minister's Gold Medal",
    source: "Gjimnazi Babë Dudë Karbunara diploma; Prime Minister's Office Gold Medal, 19 Dec 2023",
  },
  {
    value: 1,
    suffix: "+ YR",
    label: "Building enterprise Java software for real users",
    source: "Logistiqo, Junior Java Developer, Aug 2025 to Jun 2026; Joint Services since Oct 2026",
  },
  {
    value: 13,
    label: "Software projects designed and built",
    source:
      "Herisaga, Herisaga-Authoring, Ritema, WorkNest, Garbage Classifier, PyramidOs, Library Management System, Hospital Management System, Electronics Store, Portfolio, Real Estate Management System, ... (github.com/Shpetim10)",
  },
];
