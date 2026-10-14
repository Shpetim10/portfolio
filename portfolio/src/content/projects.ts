import { todo } from "./todo";
import type { Media, Project } from "./types";

// Image files are named as the owner supplied them and live in /public/assets/work/<slug>/.
// TODO(content): the assets are not yet in /public; width and height are 0 until they are,
// and every figure shows a marked placeholder frame until then.
const image = (slug: string, file: string, alt: string): Media => ({
  src: `/assets/work/${slug}/${file}`,
  alt,
  width: 0, // TODO(content)
  height: 0, // TODO(content)
  kind: "image",
});

const missingCover = (slug: string): Media => ({
  src: `/assets/work/${slug}/cover.jpg`, // TODO(content): asset not yet supplied
  alt: todo("Cover alt text"),
  width: 0, // TODO(content)
  height: 0, // TODO(content)
  kind: "image",
});

/**
 * The story's figures index the gallery: `Spread media={0}` is the strongest visual
 * (the cover) and `Shot media={1..3}` are the screenshots, so the cover leads the gallery.
 */
const gallery = (slug: string, cover: Media, shots: [file: string, alt: string][]): Media[] => [
  cover,
  ...shots.map(([file, alt]) => image(slug, file, alt)),
];

const worktrezzCover = image(
  "worktrezz",
  "worknest-cover.png",
  "WorkTrezz manager dashboard showing attendance, leave requests and announcements",
);
const ritemaCover = image(
  "ritema",
  "beloyal-cover.png",
  "Ritema mobile app showing a customer's points balance and available rewards",
);
const garbageCover = image(
  "garbage-classifier",
  "garbage-classifier-cover.png",
  "Grid of waste photos labeled by the model's predicted category",
);
const pyramidosCover = image(
  "pyramidos",
  "pyramidos-cover.png",
  "PyramidOs planning screen next to a 3D mockup of the Pyramid venue",
);
const libraryCover = image(
  "library-management-system",
  "library-cover.png",
  "Library marketplace page listing books with prices and availability",
);

// Featured projects: 3–5 (the build fails otherwise).
export const projects: Project[] = [
  {
    slug: "herisaga-history-as-playable-stories",
    partNumber: "P/N 01",
    title: "HERISAGA — History as Playable Stories",
    client: "Personal startup",
    year: 2026,
    role: "Co-Founder, Full-Stack Software Engineer",
    team: "Co-founding team (2)",
    duration: "4 Months",
    summary:
      "A bilingual mobile app that turns Albanian history into playable stories, with interactive lessons, review sessions and progress tracking. I co-founded HERISAGA, and we are building it toward a production release and in the near future expanding with global history.",
    layers: ["interface", "api", "services", "data", "infrastructure"],
    stack: [
      "Flutter",
      "Dart",
      "Riverpod",
      "go_router",
      "Drift/SQLite",
      "Lottie",
      "TypeScript",
      "Node.js",
      "NestJS",
      "Kysely",
      "Zod",
      "PostgreSQL",
      "Supabase Auth",
      "OpenAPI",
      "JSON Schema",
      "Docker",
      "GitHub Actions",
      "Sentry",
      "PostHog",
    ],
    outcomes: [
      { value: "2438", label: "Mobile tests passing" },
      { value: "501", label: "API checks passing across integration, security, end-to-end and smoke suites" },
      { value: "4", label: "Interactive question formats" },
      { value: "2", label: "Languages: English and Albanian" },
    ],
    cover: missingCover("herisaga-history-as-playable-stories"), // TODO(content): no cover image supplied
    gallery: [], // TODO(content): no screenshots supplied
    links: [],
    featured: true,
    order: 1,
  },
  {
    slug: "herisaga-authoring",
    partNumber: "P/N 02",
    title: "HERISAGA Authoring",
    client: "Personal startup",
    year: 2026,
    role: "Co-Founder, Software Engineer",
    team: "Co-Founding Team (2)",
    duration: "4 Months",
    summary:
      "The AI authoring system behind HERISAGA. It retrieves passages from historical sources, drafts lessons and questions with an LLM grounded in that evidence, and routes every draft through human review before publication. It is built so that AI speeds up writing history without inventing it.",
    layers: ["interface", "services", "data", "infrastructure"],
    stack: [
      "Python",
      "FastAPI",
      "Jinja2",
      "HTMX",
      "OpenAI SDK",
      "Voyage embeddings and reranking",
      "pgvector",
      "PostgreSQL",
      "Directus",
      "JSON Schema",
      "Docker",
    ],
    outcomes: [
      { value: "4", label: "Authoring stages: retrieve evidence, draft, review, publish" },
      { value: "0", label: "Drafts that can reach learners without human review" },
    ],
    cover: missingCover("herisaga-authoring"), // TODO(content): no cover image supplied
    gallery: [], // TODO(content): no screenshots supplied
    links: [],
    featured: true,
    order: 2,
  },
  {
    slug: "ritema",
    partNumber: "P/N 03",
    title: "Ritema — Loyalty Program Platform",
    client: "Epoka University, graduation project",
    year: 2026,
    role: "Solo full-stack software engineer",
    team: "Solo",
    duration: "One semester",
    summary:
      "A loyalty and rewards platform for local businesses. Businesses manage customers, points, rewards and coupons, and customers collect and redeem benefits by QR code in a mobile app. My solo graduation project, built and documented end to end.",
    layers: ["interface", "api", "services", "data"],
    stack: ["Java", "Spring Boot", "Spring Security", "JWT", "MySQL", "Redis", "Flutter", "Dart"],
    outcomes: [
      { value: "Solo", label: "Full-stack build, from API and database to mobile app" },
      { value: "On time", label: "Delivered with full documentation by the graduation deadline" },
      { value: "QR", label: "Instant point collection and reward redemption" },
    ],
    cover: ritemaCover,
    gallery: gallery("ritema", ritemaCover, [
      ["beloyal-1.png", "Customer home screen with points balance and rewards"],
      ["beloyal-2.png", "QR code redemption screen at the point of sale"],
      ["beloyal-3.png", "Business view for managing rewards and coupons"],
    ]),
    links: [
      { label: "API repository", href: "https://github.com/Shpetim10/BeLoyal-API" },
      { label: "Mobile repository", href: "https://github.com/Shpetim10/Ritema-Mobile" },
    ],
    featured: true,
    order: 3,
  },
  {
    slug: "worktrezz",
    partNumber: "P/N 04",
    title: "WorkTrezz — HR Management Platform",
    client: "Epoka University, team project (product name WorkTrezz)",
    year: 2026,
    role: "Lead software engineer, planning support",
    team: "6 members, one of two main developers",
    duration: "One semester",
    summary:
      "An HR platform for small companies that brings employees, departments, attendance, leave requests and announcements into one system, delivered as a Spring Boot API, a Next.js web app for managers and a React Native app for employees.",
    layers: ["interface", "api", "services", "data"],
    stack: [
      "Java",
      "Spring Boot",
      "PostgreSQL",
      "Liquibase",
      "WebSockets",
      "Next.js",
      "TypeScript",
      "React Native",
    ],
    outcomes: [
      { value: "3", label: "Connected apps: API, manager web app, employee mobile app" },
      { value: "6", label: "Team members, as one of two main developers" },
      { value: "Live", label: "Attendance and notifications pushed over WebSockets" },
      { value: "GPS", label: "Location-aware clock-in for employees in the field" },
    ],
    cover: worktrezzCover,
    gallery: gallery("worktrezz", worktrezzCover, [
      ["worknest-1.png", "Manager web dashboard with attendance overview and pending leave requests"],
      ["worknest-2.png", "Employee mobile app clock-in screen with location confirmation"],
      ["worknest-3.png", "Real-time notification arriving in the web app after an employee clocks in"],
    ]),
    links: [
      { label: "API repository", href: "https://github.com/Shpetim10/WorkNest-Api" },
      { label: "Web repository", href: "https://github.com/Shpetim10/WorkNest-Web" },
      { label: "Mobile repository", href: "https://github.com/Shpetim10/WorkNest-Mobile" },
    ],
    featured: true,
    order: 4,
  },
  {
    slug: "garbage-classifier",
    partNumber: "P/N 05",
    title: "Garbage Classifier — Computer Vision",
    client: "Epoka University, AI course team project",
    year: 2025,
    role: "Machine learning developer",
    team: "AI course team",
    duration: "One semester",
    summary:
      "A computer vision model that classifies photos of waste by type. Built in a team for my AI course, my transfer-learning model was selected as the team's final model because it achieved the highest accuracy.",
    layers: ["services", "data", "interface"],
    stack: ["Python", "Streamlit", "TensorFlow", "Transfer learning", "Computer vision", "Kaggle dataset"],
    outcomes: [
      { value: "#1", label: "Highest accuracy among the team's candidate models" },
      { value: "±97%", label: "Test-set accuracy of the final model" },
    ],
    cover: garbageCover,
    gallery: gallery("garbage-classifier", garbageCover, [
      ["garbage-classifier-1.png", "Sample images from the dataset across waste categories"],
      ["garbage-classifier-2.png", "Training and validation accuracy curves for the final model"],
      ["garbage-classifier-3.png", "Confusion matrix of the final model on the test set"],
    ]),
    links: [
      {
        label: "Repository",
        href: "https://github.com/Shpetim10/Garbage-Classifier-with-Computer-Vision",
      },
    ],
    // The intake marked six projects featured; the build allows 3–5, so this one is filed in the full list.
    featured: false,
    order: 5,
  },
  {
    slug: "pyramidos",
    partNumber: "P/N 06",
    title: "PyramidOs — Event Planning Platform (AADF Challenge)",
    client: "Junction Hackathon, Pyramid Backstage challenge",
    year: 2026,
    role: "Team lead and developer",
    team: "5 members",
    duration: "48 hours",
    summary:
      "A digital event-planning system built in 48 hours at the Junction Hackathon. It replaces scattered emails, calls and spreadsheets with one flow for requests, venue matching, proposals, equipment booking and task coordination. Top 3 in the Pyramid Backstage challenge and progressed to the final.",
    layers: ["interface", "api", "services", "data", "infrastructure"],
    stack: ["Next.js", "Node.js", "AI", "3D venue mockup"],
    outcomes: [
      { value: "48h", label: "From idea to working demo" },
      { value: "Top 3", label: "Pyramid Backstage challenge" },
      { value: "Top 11", label: "Teams overall in the final round" },
    ],
    cover: pyramidosCover,
    gallery: gallery("pyramidos", pyramidosCover, [
      ["pyramidos-1.png", "Event request form and venue matching results"],
      ["pyramidos-2.png", "Equipment booking calendar with a scheduling conflict flagged"],
      ["pyramidos-3.png", "3D mockup of the Pyramid venue used for planning"],
    ]),
    links: [{ label: "Demo video", href: "https://youtu.be/705brgOoMLU" }],
    featured: true,
    order: 6,
  },
  {
    slug: "library-management-system",
    partNumber: "P/N 07",
    title: "Library Management System",
    client: "Epoka University, Web Technologies course",
    year: 2024,
    role: "Team leader and developer",
    team: "Course team",
    duration: "One semester",
    summary:
      "A web system for running a library, with a book marketplace and ordering, book and stock management, and a client-facing site. I led the team and built several core modules.",
    layers: ["interface", "api", "data", "services", "infrastructure"],
    stack: ["PHP", "MySQL", "JavaScript", "HTML", "CSS", "SCSS"],
    outcomes: [
      { value: "3", label: "Core modules I built: marketplace and orders, stock, client site" },
      { value: "Lead", label: "Team leader for planning and delivery" },
    ],
    cover: libraryCover,
    gallery: gallery("library-management-system", libraryCover, [
      ["library-management-system-1.png", "Book marketplace page with search and availability"],
      ["library-management-system-2.png", "Stock management table for librarians"],
      ["library-management-system-3.png", "Order summary and checkout page"],
    ]),
    links: [{ label: "Repository", href: "https://github.com/Shpetim10/Library-Management-System" }],
    featured: false,
    order: 7,
  },
];
