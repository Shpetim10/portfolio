import type { Skill, SkillIcon } from "./types";

// T08b · Each part's mark on the assembly line (types.ts SkillIcon). Slugs are the
// packages' own file names: node_modules/simple-icons/icons/<slug>.svg and
// node_modules/devicon/icons/<slug>/<slug>-plain.svg. `pnpm stack:icons` builds the sprite.
const si = (slug: string): SkillIcon => ({ source: "simple-icons", slug });
const dev = (slug: string): SkillIcon => ({ source: "devicon", slug });
const mono = (text: string): SkillIcon => ({ source: "monogram", text });

// Project slugs (src/content/projects.ts). The intake still used the earlier slugs
// "worknest" and "beloyal"; those projects are now "worktrezz" and "ritema".
const herisaga = "herisaga-history-as-playable-stories";
const authoring = "herisaga-authoring";
const ritema = "ritema";
const worktrezz = "worktrezz";
const garbage = "garbage-classifier";
const pyramidos = "pyramidos";
const library = "library-management-system";
const whiteLies = "white-lies";

export const skills: Skill[] = [
  { name: "Java", layer: "services", projects: [worktrezz, ritema], icon: dev("java") },
  { name: "Spring Boot", layer: "api", projects: [worktrezz, ritema], icon: si("springboot") },
  {
    name: "Spring Security and JWT",
    layer: "api",
    projects: [ritema, worktrezz],
    icon: si("springsecurity"),
  },
  { name: "NestJS", layer: "api", projects: [herisaga], icon: si("nestjs") },
  { name: "FastAPI", layer: "api", projects: [authoring], icon: si("fastapi") },
  {
    name: "OpenAPI and JSON Schema",
    layer: "api",
    projects: [herisaga, authoring],
    icon: si("openapiinitiative"),
  },
  { name: "Zod", layer: "api", projects: [herisaga], icon: si("zod") },
  { name: "Supabase Auth", layer: "api", projects: [herisaga], icon: si("supabase") },
  { name: "Java EE", layer: "api", projects: [], icon: mono("JEE") },
  {
    name: "REST API design",
    layer: "api",
    projects: [worktrezz, ritema, library, herisaga, pyramidos],
    icon: mono("REST"),
  },
  { name: "Node.js", layer: "api", projects: [herisaga, pyramidos], icon: si("nodedotjs") },
  { name: "PHP", layer: "api", projects: [library], icon: si("php") },
  { name: "WebSockets", layer: "services", projects: [worktrezz], icon: mono("WS") },
  {
    name: "Python",
    layer: "services",
    projects: [garbage, authoring, whiteLies],
    icon: si("python"),
    ai: true,
  },
  { name: "TensorFlow", layer: "services", projects: [garbage], icon: si("tensorflow"), ai: true },
  { name: "Computer vision", layer: "services", projects: [garbage], icon: mono("CV"), ai: true },
  {
    name: "Machine learning: classification, clustering, regression",
    layer: "services",
    projects: [garbage],
    icon: mono("ML"),
    ai: true,
  },
  {
    name: "Deep learning and neural networks",
    layer: "services",
    projects: [garbage],
    icon: mono("DL"),
    ai: true,
  },
  { name: "Transfer learning", layer: "services", projects: [garbage], icon: mono("TL"), ai: true },
  {
    name: "LLM integration",
    layer: "services",
    projects: [authoring, pyramidos],
    icon: mono("LLM"),
    ai: true,
  },
  { name: "OpenAI SDK", layer: "services", projects: [authoring], icon: mono("OAI"), ai: true },
  {
    name: "Embeddings and reranking (Voyage)",
    layer: "services",
    projects: [authoring],
    icon: mono("EMB"),
    ai: true,
  },
  { name: "Jupyter", layer: "services", projects: [whiteLies], icon: si("jupyter") },
  { name: "C and C++", layer: "services", projects: [], icon: si("cplusplus") },
  { name: "C#", layer: "services", projects: [], icon: dev("csharp") },
  { name: "PostgreSQL", layer: "data", projects: [worktrezz, herisaga, authoring], icon: si("postgresql") },
  { name: "MySQL", layer: "data", projects: [ritema, library], icon: si("mysql") },
  { name: "Redis", layer: "data", projects: [ritema, herisaga], icon: si("redis") },
  { name: "Liquibase", layer: "data", projects: [worktrezz, ritema], icon: si("liquibase") },
  { name: "Hibernate and JPA", layer: "data", projects: [worktrezz, ritema], icon: si("hibernate") },
  { name: "SQLite and Drift", layer: "data", projects: [herisaga], icon: si("sqlite") },
  { name: "Kysely", layer: "data", projects: [herisaga], icon: mono("KYS") },
  { name: "pgvector", layer: "data", projects: [authoring], icon: mono("PGV"), ai: true },
  { name: "Directus", layer: "data", projects: [authoring], icon: si("directus") },
  { name: "Parquet and PyArrow", layer: "data", projects: [whiteLies], icon: si("apacheparquet") },
  { name: "pandas, NumPy and SciPy", layer: "data", projects: [whiteLies], icon: si("pandas") },
  { name: "matplotlib and seaborn", layer: "data", projects: [whiteLies], icon: dev("matplotlib") },
  {
    name: "Data analysis and data mining",
    layer: "data",
    projects: [whiteLies, garbage, authoring, pyramidos],
    icon: mono("DA"),
    ai: true,
  },
  {
    name: "TypeScript",
    layer: "interface",
    projects: [worktrezz, herisaga, pyramidos],
    icon: si("typescript"),
  },
  { name: "React", layer: "interface", projects: [worktrezz, pyramidos], icon: si("react") },
  { name: "Next.js", layer: "interface", projects: [worktrezz, pyramidos], icon: si("nextdotjs") },
  { name: "React Native", layer: "interface", projects: [worktrezz], icon: si("react") },
  { name: "Flutter and Dart", layer: "interface", projects: [ritema, herisaga], icon: si("flutter") },
  { name: "Riverpod and go_router", layer: "interface", projects: [herisaga], icon: mono("RP") },
  { name: "Lottie", layer: "interface", projects: [herisaga], icon: mono("LOT") },
  { name: "Angular", layer: "interface", projects: [], icon: si("angular") },
  {
    name: "JavaScript",
    layer: "interface",
    projects: [library, pyramidos, worktrezz, herisaga, whiteLies],
    icon: si("javascript"),
  },
  { name: "HTML, CSS and SCSS", layer: "interface", projects: [library], icon: si("html5") },
  { name: "HTMX and Jinja2", layer: "interface", projects: [authoring], icon: si("htmx") },
  { name: "Streamlit", layer: "interface", projects: [garbage], icon: si("streamlit") },
  { name: "MkDocs Material", layer: "interface", projects: [whiteLies], icon: si("materialformkdocs") },
  {
    name: "Git and GitHub",
    layer: "infrastructure",
    projects: [worktrezz, ritema, garbage, pyramidos, library, herisaga, authoring, whiteLies],
    icon: si("git"),
  },
  {
    name: "Docker",
    layer: "infrastructure",
    projects: [herisaga, authoring, ritema, worktrezz],
    icon: si("docker"),
  },
  {
    name: "GitHub Actions",
    layer: "infrastructure",
    projects: [herisaga, whiteLies],
    icon: si("githubactions"),
  },
  { name: "GitHub Pages", layer: "infrastructure", projects: [whiteLies], icon: si("githubpages") },
  { name: "Sentry and PostHog", layer: "infrastructure", projects: [herisaga], icon: si("sentry") },
  { name: "pytest", layer: "infrastructure", projects: [whiteLies], icon: si("pytest") },
  { name: "Maven", layer: "infrastructure", projects: [worktrezz, ritema], icon: si("apachemaven") },
  {
    name: "Postman",
    layer: "infrastructure",
    projects: [worktrezz, ritema, herisaga, pyramidos],
    icon: si("postman"),
  },
];
