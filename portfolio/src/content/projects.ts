import type { Media, Project } from "./types";

// Image files are named as the owner supplied them and live in /public/assets/work/<slug>/.
// TODO(content): the assets are not yet in /public; width and height are 0 until they are,
// and every figure shows a marked placeholder frame until then.
const image = (slug: string, file: string, alt: string, size?: [width: number, height: number]): Media => ({
  src: `/assets/work/${slug}/${file}`,
  alt,
  width: size?.[0] ?? 0, // TODO(content) until the file is supplied
  height: size?.[1] ?? 0, // TODO(content) until the file is supplied
  kind: "image",
});

/**
 * The story's figures index the gallery: `Spread media={0}` is the strongest visual
 * (the cover) and `Shot` / `Screens` media={1…} are the screenshots, so the cover leads the gallery.
 */
const gallery = (
  slug: string,
  cover: Media,
  shots: [file: string, alt: string, size?: [width: number, height: number]][],
): Media[] => [cover, ...shots.map(([file, alt, size]) => image(slug, file, alt, size))];

const herisagaCover = image(
  "herisaga-history-as-playable-stories",
  "herisaga-cover.webp",
  "Three HERISAGA app screens on phones, a multiple-choice question, the Road and a completed lesson, in front of an old Albanian hillside town",
  [1672, 941],
);

// Phone screenshots, 750 × 1623 (the 1284 × 2778 originals, as WebP).
const PHONE: [number, number] = [750, 1623];
const herisagaShots: [string, string, [number, number]][] = [
  // The Road
  [
    "herisaga-01.webp",
    "The Road in the light theme: History of Albanians, chapter 2 Illyrians, with a start flag on a path of locked lessons",
    PHONE,
  ],
  [
    "herisaga-02.webp",
    "The Road in the light theme, in Albanian: Historia e shqiptarëve, kapitulli 2 Iliret, with the flag labelled Fillo",
    PHONE,
  ],
  [
    "herisaga-03.webp",
    "The Road in the dark theme, in English, with the start flag on a path of locked lessons",
    PHONE,
  ],
  ["herisaga-04.webp", "The Road in the dark theme, in Albanian", PHONE],
  [
    "herisaga-05.webp",
    "The Road in the light theme with a sheet offering to continue the lesson The Queen, the Sea, and the Roman Envoys, worth up to 128 XP",
    PHONE,
  ],
  ["herisaga-06.webp", "The same continue-lesson sheet on the Road in the dark theme", PHONE],
  // Episode: Who counts as Illyrian?
  [
    "herisaga-07.webp",
    "A lesson passage titled A regional name is not the whole story, with the key place name highlighted and a Continue button",
    PHONE,
  ],
  [
    "herisaga-08.webp",
    "A multiple-choice question about what Appian's statement establishes, with four options and the Check answer button still disabled",
    PHONE,
  ],
  ["herisaga-09.webp", "The same question with one option chosen and Check answer enabled", PHONE],
  [
    "herisaga-10.webp",
    "The same question answered correctly, with a green Correct banner and a short explanation of why",
    PHONE,
  ],
  [
    "herisaga-11.webp",
    "A true-or-false question answered wrongly, with a Not quite banner and an explanation",
    PHONE,
  ],
  [
    "herisaga-12.webp",
    "The next lesson passage, One region, several named groups, with the dates of the events in blue",
    PHONE,
  ],
  [
    "herisaga-13.webp",
    "Lesson completed: a 7 of 8 ring marked Perfect lesson, 102 XP earned and a one-day streak",
    PHONE,
  ],
  // Episode: Silver under the mountains
  [
    "herisaga-14.webp",
    "A dark-theme lesson passage, Damastion: What Can Coins Tell Us?, about silver coins and the location of a city",
    PHONE,
  ],
  [
    "herisaga-15.webp",
    "A dark-theme multiple-choice question about why scholars compare Damastion's coins with Paionian coins",
    PHONE,
  ],
  ["herisaga-16.webp", "The same question with one option chosen", PHONE],
  [
    "herisaga-17.webp",
    "The same question answered wrongly: the wrong option in red, the right one in green and a Not quite banner",
    PHONE,
  ],
  [
    "herisaga-18.webp",
    "A dark-theme true-or-false question answered correctly, with a Correct banner",
    PHONE,
  ],
  [
    "herisaga-19.webp",
    "Lesson completed in the dark theme: a 5 of 8 ring marked Great job and 74 XP earned",
    PHONE,
  ],
  // Review
  [
    "herisaga-20.webp",
    "The Review tab in the dark theme: one lesson ready, topic filters and a Start review session button",
    PHONE,
  ],
  [
    "herisaga-21.webp",
    "The Review list scrolled, with lessons grouped by chapter and each question marked Needs practice or Scheduled",
    PHONE,
  ],
  [
    "herisaga-22.webp",
    "The Review tab in the light theme with its topic filters and the Start review session button",
    PHONE,
  ],
  [
    "herisaga-23.webp",
    "The Review list in the light theme, scrolled to the questions that need practice",
    PHONE,
  ],
  // Profile and settings
  [
    "herisaga-24.webp",
    "The Profile screen in the dark theme: avatar, name, streak, XP, lessons completed and the Chronicle of artifacts and achievements",
    PHONE,
  ],
  ["herisaga-25.webp", "The Profile screen in the light theme", PHONE],
  [
    "herisaga-26.webp",
    "Settings in the light theme: daily goal, reminders, sound effects, haptic feedback and the appearance switch",
    PHONE,
  ],
  ["herisaga-27.webp", "Settings in the dark theme", PHONE],
  [
    "herisaga-28.webp",
    "Edit profile in the light theme: name, handle, English or Albanian, what brings you to HERISAGA and the daily goal",
    PHONE,
  ],
  ["herisaga-29.webp", "Edit profile in the dark theme", PHONE],
];
const authoringCover = image(
  "herisaga-authoring",
  "herisaga-authoring-cover.webp",
  "Episode Studio on a laptop, reviewing a drafted passage and multiple-choice question beside the grounding facts behind them, over old maps and a magnifying glass",
  [1672, 941],
);
const worktrezzCover = image(
  "worktrezz",
  "worktrezz-cover.webp",
  "WorkTrezz manager dashboard on a laptop beside the employee app's clock-in screen on a phone",
  [1672, 941],
);
const ritemaCover = image(
  "ritema",
  "ritema-cover.webp",
  "Three Ritema app screens on phones, Home with a Beats balance and a live Drop, the membership card with its QR code, and a place's standing, on a café counter beside an espresso machine and cups",
  [1672, 941],
);

// Phone screenshots of the customer app, in the order of the story's strips (originals in /assets-src/ritema).
const ritemaShots: [string, string, [number, number]][] = [
  // Welcome
  [
    "ritema-01.webp",
    "Ritema sign-in: the line Return in rhythm. Become known., fields for email or username and password, a Forgot your password link and a Sign in button",
    PHONE,
  ],
  [
    "ritema-02.webp",
    "A welcome screen reading You're in rhythm: your profile is set, and every visit from here builds your Glow, with an Enter Ritema button",
    PHONE,
  ],
  [
    "ritema-03.webp",
    "The Home tab: a greeting, a card with 2,480 Beats and the Ritema Select access status, and a live Source Drop with a countdown",
    PHONE,
  ],
  [
    "ritema-04.webp",
    "Home scrolled: cards showing how close the customer is to the next recognition level at two places, then a list of recent Beats earned and redeemed",
    PHONE,
  ],
  // Discover
  [
    "ritema-05.webp",
    "Discover with the Places tab open: a search field, category filters, and recommended places with their opening hours, rating and the customer's recognition level",
    PHONE,
  ],
  [
    "ritema-06.webp",
    "Discover with the Map tab open: a dark map of Tirana with a pin for each place, zoom controls and the label 55 places on Ritema",
    PHONE,
  ],
  // A place
  [
    "ritema-07.webp",
    "A place's Status tab: the customer's standing, Regular, with 3,180 lifetime Beats, 620 available Beats and a five-step path from First Beat to Known by Name",
    PHONE,
  ],
  [
    "ritema-08.webp",
    "A place's Coupons section: a limited Drop for free churros with a Tap to redeem prompt, beside tabs for the customer's own coupons and the ones released",
    PHONE,
  ],
  [
    "ritema-09.webp",
    "A place's menu: category filters and dishes with their prices and the Beats each one earns",
    PHONE,
  ],
  [
    "ritema-10.webp",
    "A place's House Rules: one Beat earned per ten euros spent, a cap of 500 Beats per visit and Beats that expire after 12 months without a visit, above the customer's own timeline there",
    PHONE,
  ],
  [
    "ritema-11.webp",
    "A place's community and hours: friends who returned this week, the trending and most redeemed items, a count of regulars and the opening hours by day",
    PHONE,
  ],
  [
    "ritema-12.webp",
    "A place's contact options and amenities, with a Call button, a Website button, Wi-Fi, Pet friendly, Parking and Accessible tags, and a map of its location in Tirana",
    PHONE,
  ],
  // At a place
  [
    "ritema-13.webp",
    "The Reserve your table sheet: the name it is reserved under, a choice of date and time, party size, a notes field and a note that the reservation earns Beats on arrival",
    PHONE,
  ],
  [
    "ritema-14.webp",
    "The Rate a place sheet: five empty stars, tags such as Great service and Good value, a field for more detail and a Post review button, with a note on how lower ratings are handled",
    PHONE,
  ],
  [
    "ritema-15.webp",
    "A menu item, Mango Lemonade, with its description, a choice of two sizes with prices, a quantity stepper and an Add to order button",
    PHONE,
  ],
  // Drops and coupons
  [
    "ritema-16.webp",
    "A Drop for free churros: what the customer gets, a short instruction to show the code at the counter and a Use button",
    PHONE,
  ],
  [
    "ritema-17.webp",
    "A live Drop, a limited 20% off with a countdown, in a sheet over Discover, with a note that it is first come, first served and a Claim button",
    PHONE,
  ],
  [
    "ritema-18.webp",
    "The same live Drop with its sheet fully open, showing the limited-time notice and the Claim button",
    PHONE,
  ],
  [
    "ritema-19.webp",
    "Redeeming a free protein shake coupon: its code and expiry, a prompt that it is ready to redeem at the counter and a Use button",
    PHONE,
  ],
  // Wallet and membership
  [
    "ritema-20.webp",
    "The Wallet tab: a ring showing 2,480 available Beats, lifetime, status and expired Beats, counts of coupons ready, redeemed and expired, and the customer's recognition and access levels",
    PHONE,
  ],
  [
    "ritema-21.webp",
    "The Wallet scrolled to Places in rhythm: a paged list of places with the customer's level and Beats at each, and the number of coupons ready",
    PHONE,
  ],
  [
    "ritema-22.webp",
    "The Wallet's ledger: every Beats earn and redemption grouped by day, each with its place, amount and time",
    PHONE,
  ],
  [
    "ritema-23.webp",
    "The membership card: the customer's name, a QR code and member code, and a five-step access path from Active to Crown",
    PHONE,
  ],
  // Profile
  [
    "ritema-24.webp",
    "The Profile tab: the customer's name, member since date, recognition and access levels, an Edit profile button and a line chart called Your signature",
    PHONE,
  ],
];
const garbageCover = image(
  "garbage-classifier",
  "garbage-classifier-cover.webp",
  "Project overview poster: the twelve waste categories, the final model's confusion matrix and the recycling guidance",
  [1672, 941],
);
const pyramidosCover = image(
  "pyramidos",
  "pyramidos-cover.webp",
  "Pyramid OS Create Event screen on a laptop, asking what you want to host, in front of the Pyramid of Tirana",
  [1672, 941],
);
const libraryCover = image(
  "library-management-system",
  "library-management-system-cover.webp",
  "Eternal Library marketplace on a laptop, with book categories and book cards, in front of dim library shelves",
  [1920, 1080],
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
    cover: herisagaCover,
    gallery: gallery("herisaga-history-as-playable-stories", herisagaCover, herisagaShots),
    links: [],
    site: { label: "herisaga.com", href: "https://herisaga.com" },
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
      "The AI authoring system behind HERISAGA. A source-to-facts pipeline chunks and indexes historical sources and extracts cited, structured facts from them, so every episode starts from evidence instead of a blank page. People review each fact before lessons and questions are drafted from the approved ones in English and Albanian, and editors approve every episode in Directus before it is published as a pinned revision. It is built so that AI makes writing history faster without inventing it.",
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
      { value: "11", label: "Tracked steps from topic and retrieval to a recorded publish" },
      { value: "0", label: "Drafts that can reach learners without human review" },
    ],
    cover: authoringCover,
    gallery: gallery("herisaga-authoring", authoringCover, [
      [
        "herisaga-authoring-1.webp",
        "Episode Studio's passages and exercises step: a drafted passage and a multiple-choice question in English, with the four grounding facts behind it listed in English and Albanian",
        [2906, 1602],
      ],
      [
        "herisaga-authoring-2.webp",
        "The whole Retrieval console page: a topic and collection, an abstention check showing the top rerank score above its threshold, a table of retrieved source chunks with dense, lexical, fused and rerank scores, and a token and cost estimate to confirm before extracting facts",
        [2934, 15948],
      ],
      [
        "herisaga-authoring-3.webp",
        "Fact review in the Episode Studio: one claim in English and Albanian with its subject, relation, object and date, the source it came from, the highlighted passage, and buttons to approve, reject, edit, skip or undo",
        [2934, 2590],
      ],
      [
        "herisaga-authoring-4.webp",
        "The whole Fact review all-at-once page: eleven extracted claims listed with their structured fields, sources and a Reject button each, ending in a single Approve all 11 button",
        [2934, 8766],
      ],
      [
        "herisaga-authoring-5.webp",
        "The whole Directus page for an episode: its English and Albanian translations side by side, then its slug, status, published revision and timestamps",
        [2934, 5194],
      ],
      [
        "herisaga-authoring-6.webp",
        "Publish, step 11 of 11 in the Episode Studio: every step checked off, and the publish run recorded with its outcome, run ID, revision, content hash and who published it",
        [2934, 1603],
      ],
    ]),
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
    gallery: gallery("ritema", ritemaCover, ritemaShots),
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
      [
        "worktrezz-2.webp",
        "Attendance screen with today's present, absent, late, on-leave and warning counts, and each employee's site, check-in, check-out and hours worked",
        [3024, 1718],
      ],
      [
        "worktrezz-10.webp",
        "Attendance QR terminal for the Tirana HQ site, showing a live QR code that rotates every 60 seconds",
        [3024, 1718],
      ],
      [
        "worktrezz-3.webp",
        "Leave request list with each employee's site, department, leave type, dates and status, and approve or reject actions on pending requests",
        [3024, 1718],
      ],
      [
        "worktrezz-5.webp",
        "Monthly payroll table with each employee's type, payment method, base pay, overtime, bonuses, deductions and net pay",
        [3024, 1718],
      ],
      [
        "worktrezz-7.webp",
        "Assign Employees dialog moving employees from an available list into a supervisor's team",
        [3024, 1718],
      ],
      [
        "worktrezz-6.webp",
        "Announcements list with notices for specific people, a department or all employees, important ones flagged",
        [3024, 1718],
      ],
      [
        "worktrezz-mobile-1.webp",
        "Employee app home screen with today's attendance status, leave balance, latest payroll and announcements",
        [740, 1600],
      ],
      [
        "worktrezz-mobile-2.webp",
        "Employee app attendance screen after a successful check-in, with the Clock Out button, the site's QR and GPS requirements and today's records",
        [740, 1600],
      ],
      [
        "worktrezz-mobile-4.webp",
        "Employee app leave screen with vacation, sick and parental leave balances and the history of past requests",
        [740, 1600],
      ],
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
      ["garbage-classifier-1.webp", "Sample images from the dataset across waste categories", [1672, 941]],
      [
        "garbage-classifier-2.webp",
        "Training and validation accuracy curves for the final model",
        [1448, 1086],
      ],
      [
        "garbage-classifier-3.webp",
        "Test metrics, per-class precision and recall, and confusion matrix of the final model",
        [2800, 2800],
      ],
      [
        "garbage-classifier-4.webp",
        "Streamlit web app classifying an uploaded photo, with confidence per category",
        [1586, 992],
      ],
      [
        "garbage-classifier-5.webp",
        "Accuracy of the team's candidate models compared on held-out data",
        [3200, 2000],
      ],
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
    stack: ["LLM parsing", "Next.js", "Node.js", "AI room recommendations", "3D venue mockup"],
    outcomes: [
      { value: "48h", label: "From idea to working demo" },
      { value: "Top 3", label: "Pyramid Backstage challenge" },
      { value: "Top 11", label: "Teams overall in the final round" },
    ],
    cover: pyramidosCover,
    gallery: gallery("pyramidos", pyramidosCover, [
      [
        "pyramidos-0.webp",
        "Pyramid OS public site with an interactive 3D model of the Pyramid of Tirana and a prompt to enter it",
        [3024, 1728],
      ],
      [
        "pyramidos-8.webp",
        "Explore Pyramid: an orbitable 3D model of the Pyramid and its surroundings with floor controls, a list of spaces, and the Mane Foundation room selected, showing its capacity, facilities and what it hosts",
        [2000, 1136],
      ],
      [
        "pyramidos-2.webp",
        "Pyramid AI analyzing an event request: parsing it, extracting requirements, sizing spaces, checking venue availability and building plan options",
        [1655, 950],
      ],
      [
        "pyramidos-3.webp",
        "Two plans for a 60-guest workshop: Value in the Blue Room from €1,632 and Premium in the Orange Room from €2,076, each with its rooms and reasons",
        [1657, 949],
      ],
      [
        "pyramidos-4.webp",
        "Admin Event Requests screen with the request list and a workshop's schedule, configuration, estimated total and approve or reject actions",
        [1655, 950],
      ],
      [
        "pyramidos-5.webp",
        "Manager pipeline at the Understand step: event summary, the organizer's request and an Event DNA radar scoring eight operational dimensions",
        [3024, 1738],
      ],
      [
        "pyramidos-6.webp",
        "Inventory overview with overall health, total, reserved and available assets, and the health of each equipment category",
        [1658, 949],
      ],
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
      [
        "library-management-system-1.webp",
        "Eternal Library marketplace with a category list and book cards showing price, rating and Add To Cart",
        [1918, 871],
      ],
      [
        "library-management-system-2.webp",
        "Staff stock management table with ISBN, genres, format, inventory and a Restock action, low-stock rows highlighted",
        [1918, 868],
      ],
      [
        "library-management-system-3.webp",
        "Cart page with the selected book, quantity controls, cart total and Proceed To Checkout",
        [1913, 867],
      ],
      [
        "library-management-system-4.webp",
        "Book detail page showing Stock Available, price, quantity, Add To Cart and the book's description",
        [1918, 868],
      ],
      [
        "library-management-system-5.webp",
        "Staff order management list with customer, books, total, a status selector and date for each order",
        [1918, 870],
      ],
    ]),
    links: [{ label: "Repository", href: "https://github.com/Shpetim10/Library-Management-System" }],
    featured: false,
    order: 7,
  },
];
