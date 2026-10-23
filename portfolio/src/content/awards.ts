import type { Award, Media } from "./types";

// Photos live in /public/assets/awards/. A photo whose file is not there yet is simply left out of
// the page at build (no dead thumbnails), so entries can be declared before the files arrive. The
// lightbox sizes each photo by its natural dimensions, so none are needed here.
// A certificate supplied as a PDF is shown by a preview image (`document` is the PDF it opens).
// `caption` is the short plate title shown under the thumbnail and above the alt text in the lightbox.
const photo = (file: string, caption: string, alt: string, document?: string): Media => ({
  src: `/assets/awards/${file}`,
  ...(document && { document: `/assets/awards/${document}` }),
  alt,
  caption,
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
      href: "https://epoka.edu.al/en/MTEzMTI=/news/2026-06-29-epoka-university-celebrates-graduation-ceremony-class-2026",
    },
    featured: true,
    gallery: [
      photo(
        "epoka-head-of-faculty.jpg",
        "With the Head of Faculty",
        "Shpëtim Shabanaj receiving the First Rank Award from the Head of Faculty at Epoka University",
      ),
      photo(
        "epoka-plaques.jpeg",
        "The plaques",
        "The First Rank Award and the Plaque Award from Epoka University",
      ),
      photo(
        "epoka-first-rank-certificate.jpeg",
        "First Rank certificate",
        "Epoka University certificate naming Shpëtim Shabanaj first-ranked in Software Engineering",
      ),
    ],
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
      photo(
        "pm-with-prime-minister.jpeg",
        "With the Prime Minister",
        "Shpëtim Shabanaj with the Prime Minister of Albania at the Gold Medal ceremony",
      ),
      photo(
        "pm-gold-medal.jpeg",
        "The Gold Medal",
        "The Gold Medal for Excellent Academic Achievement awarded by the Prime Minister of Albania",
      ),
      photo(
        "pm-certificate.jpeg",
        "The certificate",
        "Certificate accompanying the Prime Minister's Gold Medal",
      ),
    ],
  },
  {
    id: "epoka-full-scholarship",
    title: "Full Scholarship",
    issuer: "Epoka University",
    // Held for all three years of the degree (2023–2026); the year it ended.
    year: 2026,
    category: "scholarship",
    placement: "100% tuition · 2023–2026",
    why: "Awarded a full scholarship for the B.Sc. Software Engineering on the strength of excellent high school results, and kept it through all three years of study.",
    featured: false,
  },
  {
    id: "holberton-ml-scholarship",
    title: "Machine Learning Scholarship",
    issuer: "AADF & AKPA",
    year: 2026,
    category: "scholarship",
    why: "Awarded a scholarship by the Albanian-American Development Foundation (AADF) and AKPA to study the Machine Learning course at Holberton School Albania.",
    featured: false,
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
    gallery: [
      photo(
        "nvidia-certificate.png",
        "Certificate",
        "NVIDIA Certificate of Competency for Fundamentals of Deep Learning, issued December 12, 2025",
      ),
    ],
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
    gallery: [photo("n8n-101-preview.jpg", "Certificate", "n8n101 Essentials certificate", "n8n-101.pdf")],
    badge: { src: "/assets/awards/n8n-101-badge.png", alt: "n8n101 Essentials digital badge" },
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
    gallery: [photo("n8n-102-preview.jpg", "Certificate", "n8n102 Integrations certificate", "n8n-102.pdf")],
    badge: { src: "/assets/awards/n8n-102-badge.png", alt: "n8n102 Integrations digital badge" },
  },
  {
    id: "oop-mentor",
    title: "Object-Oriented Programming Mentor",
    issuer: "Epoka University, Career Planning and Alumni Office",
    // The 2025–2026 academic year; the year it ended.
    year: 2026,
    category: "mentorship",
    placement: "2025–2026 academic year",
    why: "Mentored a student in the Object Oriented Programming course through the university's Mentorship Program, offering academic tutoring to improve their understanding and skills.",
    featured: false,
    gallery: [
      photo(
        "oop-mentor-preview.jpg",
        "Certificate",
        "Epoka University Certificate of Contribution naming Shpëtim Shabanaj as a mentor in the Object Oriented Programming course for the 2025–2026 academic year",
        "oop-mentor.pdf",
      ),
    ],
  },
  {
    id: "ds-mentor",
    title: "Data Structures Mentor",
    issuer: "Epoka University, Career Planning and Alumni Office",
    year: 2026,
    category: "mentorship",
    placement: "2025–2026 academic year",
    why: "Mentored a student in the Data Structures course through the university's Mentorship Program, offering academic tutoring to improve their understanding and skills.",
    featured: false,
    gallery: [
      photo(
        "ds-mentor-preview.jpg",
        "Certificate",
        "Epoka University Certificate of Contribution naming Shpëtim Shabanaj as a mentor in the Data Structures course for the 2025–2026 academic year",
        "ds-mentor.pdf",
      ),
    ],
  },
  {
    id: "gdsc-member",
    title: "Google Developer Students Club Member",
    issuer: "Epoka University",
    // The 2024–2025 academic year; the year it ended.
    year: 2025,
    category: "membership",
    placement: "2024–2025 academic year",
    why: "Member of the Google Developer Students Club, recognized for dedication and commitment to the club's activities and events.",
    featured: false,
    gallery: [
      photo(
        "gdsc-member-preview.jpg",
        "Certificate",
        "Epoka University Certificate of Appreciation naming Shpëtim Shabanaj a member of the Google Developer Students Club for the 2024–2025 academic year",
        "gdsc-member.pdf",
      ),
    ],
  },
  {
    id: "electronics-club-member",
    title: "Electronics Club Member",
    issuer: "Epoka University",
    year: 2025,
    category: "membership",
    placement: "2024–2025 academic year",
    why: "Member of the Electronics Club, recognized for dedication and commitment to the club's activities and events.",
    featured: false,
    gallery: [
      photo(
        "electronics-club-member-preview.jpg",
        "Certificate",
        "Epoka University Certificate of Appreciation naming Shpëtim Shabanaj a member of the Electronics Club for the 2024–2025 academic year",
        "electronics-club-member.pdf",
      ),
    ],
  },
  {
    id: "programming-club-member",
    title: "Programming Club Member",
    issuer: "Epoka University",
    year: 2025,
    category: "membership",
    placement: "2024–2025 academic year",
    why: "Member of the Programming Club, recognized for dedication and commitment to the club's activities and events.",
    featured: false,
    gallery: [
      photo(
        "programming-club-member-preview.jpg",
        "Certificate",
        "Epoka University Certificate of Appreciation naming Shpëtim Shabanaj a member of the Programming Club for the 2024–2025 academic year",
        "programming-club-member.pdf",
      ),
    ],
  },
  {
    id: "innovators-club-member",
    title: "Innovators Club Member",
    issuer: "Epoka University",
    year: 2025,
    category: "membership",
    placement: "2024–2025 academic year",
    why: "Member of the Innovators Club, recognized for dedication and commitment to the club's activities and events.",
    featured: false,
    gallery: [
      photo(
        "innovators-club-member-preview.jpg",
        "Certificate",
        "Epoka University Certificate of Appreciation naming Shpëtim Shabanaj a member of the Innovators Club for the 2024–2025 academic year",
        "innovators-club-member.pdf",
      ),
    ],
  },
];
