import type { Award, Media } from "./types";

// Photos live in /public/assets/awards/. A photo whose file is not there yet is simply left out of
// the page at build (no dead thumbnails), so entries can be declared before the files arrive. The
// lightbox sizes each photo by its natural dimensions, so none are needed here.
const photo = (file: string, alt: string): Media => ({
  src: `/assets/awards/${file}`,
  alt,
  width: 0,
  height: 0,
  kind: "image",
});

// Exactly ONE award is `featured`. A proof link needs both a label and an absolute URL, so
// awards whose link the owner has not supplied yet (Prime Minister's medal, NVIDIA) carry none.
export const awards: Award[] = [
  {
    id: "first-ranked-graduate",
    title: "First-Ranked Software Engineering Graduate",
    issuer: "Epoka University",
    year: 2026,
    category: "ranking",
    placement: "Rank #1 · 4.0/4.0 GPA · High Honors",
    why: "Achieved the highest rank in the B.Sc. Software Engineering program with a perfect 4.0 GPA, receiving the First Rank Award and the Plaque Award.",
    proof: {
      label: "Award plaque",
      href: "https://www.linkedin.com/posts/shpetimshabanaj_graduation-epokauniversity-softwareengineering-activity-7478016323202244608-CjuQ",
    },
    featured: true,
    gallery: [photo("epoka-first-rank-plaque.jpg", "Epoka University First Rank Award plaque")],
  },
  {
    id: "pm-gold-medal",
    title: "Gold Medal for Excellent Academic Achievement",
    issuer: "Prime Minister's Office, Republic of Albania",
    year: 2023,
    category: "ranking",
    placement: "9.94/10 high school average",
    why: "Recognized nationally for an outstanding high school record at Gjimnazi Babë Dudë Karbunara, Berat.",
    // TODO(content): proof link for "Medal and certificate".
    featured: false,
    gallery: [
      photo("pm-gold-medal.jpg", "Gold Medal and certificate awarded by the Prime Minister of Albania"),
    ],
  },
  {
    id: "junction-pyramid-backstage",
    title: "Junction Hackathon — Pyramid Backstage Challenge",
    issuer: "Junction",
    year: 2026,
    category: "hackathon",
    placement: "Top 3 in challenge · Top 11 overall",
    why: "Led a team of five to build PyramidOs, a complete event-planning system, in 48 hours.",
    proof: { label: "Demo video", href: "https://youtu.be/705brgOoMLU" },
    featured: false,
  },
  {
    id: "nvidia-deep-learning",
    title: "Fundamentals of Deep Learning",
    issuer: "NVIDIA Deep Learning Institute",
    year: 2025,
    category: "certification",
    why: "Completed hands-on training in neural networks, model training, data preparation and GPU-accelerated deep learning workflows.",
    proof: {
      label: "Certificate",
      href: "https://learn.nvidia.com/certificates?id=ZojwdLboSBeQDTMKQQ4NMg#&trk=public_profile_see-credential",
    },
    featured: false,
  },
  {
    id: "java-from-scratch",
    title: "Java From Scratch",
    issuer: "Protik",
    year: 2025,
    category: "certification",
    why: "Completed an intensive course in Java, OOP, SQL, JDBC, Hibernate and the Spring Framework (EQF level 5).",
    proof: {
      label: "Credential",
      href: "https://app.diplomasafe.com/en-US/certificates/db52474b67a8d1f59f733ee61bd691264aa02e198",
    },
    featured: false,
  },
  {
    id: "n8n-101",
    title: "n8n101 - Essentials: Your First Workflows",
    issuer: "n8n Academy",
    year: 2026,
    category: "certification",
    why: 'Completed "n8n101 - Essentials: Your First Workflows" on n8n Academy web app.',
    proof: {
      label: "Certificate, Badge",
      href: "https://badges.n8n.io/f8902a36-44b5-4fc1-abc7-561c512f679b#acc.YuMIdf0C",
    },
    featured: false,
    gallery: [photo("n8n-101.png", "n8n101 Essentials certificate")],
  },
  {
    id: "n8n-102",
    title: "n8n102 - Integrations: APIs and Connected Workflows",
    issuer: "n8n",
    year: 2026,
    category: "certification",
    why: 'Completed "n8n102 - Integrations: APIs and Connected Workflows" on n8n Academy web app.',
    proof: {
      label: "Certificate, Badge",
      href: "https://badges.n8n.io/d18ecaaa-e4c5-42bb-a314-a296c4b7b546#acc.EkWwgZOG",
    },
    featured: false,
    gallery: [photo("n8n-102.png", "n8n102 Integrations certificate")],
  },
];
