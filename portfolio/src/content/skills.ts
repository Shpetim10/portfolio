import type { Skill } from "./types";

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
  { name: "Java", layer: "services", projects: [worktrezz, ritema] },
  { name: "Spring Boot", layer: "api", projects: [worktrezz, ritema] },
  { name: "Spring Security and JWT", layer: "api", projects: [ritema, worktrezz] },
  { name: "NestJS", layer: "api", projects: [herisaga] },
  { name: "FastAPI", layer: "api", projects: [authoring] },
  { name: "OpenAPI and JSON Schema", layer: "api", projects: [herisaga, authoring] },
  { name: "Zod", layer: "api", projects: [herisaga] },
  { name: "Supabase Auth", layer: "api", projects: [herisaga] },
  { name: "Java EE", layer: "api", projects: [] },
  { name: "REST API design", layer: "api", projects: [worktrezz, ritema, library, herisaga, pyramidos] },
  { name: "Node.js", layer: "api", projects: [herisaga, pyramidos] },
  { name: "PHP", layer: "api", projects: [library] },
  { name: "WebSockets", layer: "services", projects: [worktrezz] },
  { name: "Python", layer: "services", projects: [garbage, authoring, whiteLies] },
  { name: "TensorFlow", layer: "services", projects: [garbage] },
  { name: "Computer vision", layer: "services", projects: [garbage] },
  {
    name: "Machine learning: classification, clustering, regression",
    layer: "services",
    projects: [garbage],
  },
  { name: "Deep learning and neural networks", layer: "services", projects: [garbage] },
  { name: "Transfer learning", layer: "services", projects: [garbage] },
  { name: "LLM integration", layer: "services", projects: [authoring, pyramidos] },
  { name: "OpenAI SDK", layer: "services", projects: [authoring] },
  { name: "Embeddings and reranking (Voyage)", layer: "services", projects: [authoring] },
  { name: "Jupyter", layer: "services", projects: [whiteLies] },
  { name: "C and C++", layer: "services", projects: [] },
  { name: "C#", layer: "services", projects: [] },
  { name: "PostgreSQL", layer: "data", projects: [worktrezz, herisaga, authoring] },
  { name: "MySQL", layer: "data", projects: [ritema, library] },
  { name: "Redis", layer: "data", projects: [ritema, herisaga] },
  { name: "Liquibase", layer: "data", projects: [worktrezz, ritema] },
  { name: "Hibernate and JPA", layer: "data", projects: [worktrezz, ritema] },
  { name: "SQLite and Drift", layer: "data", projects: [herisaga] },
  { name: "Kysely", layer: "data", projects: [herisaga] },
  { name: "pgvector", layer: "data", projects: [authoring] },
  { name: "Directus", layer: "data", projects: [authoring] },
  { name: "Parquet and PyArrow", layer: "data", projects: [whiteLies] },
  { name: "pandas, NumPy and SciPy", layer: "data", projects: [whiteLies] },
  { name: "matplotlib and seaborn", layer: "data", projects: [whiteLies] },
  {
    name: "Data analysis and data mining",
    layer: "data",
    projects: [whiteLies, garbage, authoring, pyramidos],
  },
  { name: "TypeScript", layer: "interface", projects: [worktrezz, herisaga, pyramidos] },
  { name: "React", layer: "interface", projects: [worktrezz, pyramidos] },
  { name: "Next.js", layer: "interface", projects: [worktrezz, pyramidos] },
  { name: "React Native", layer: "interface", projects: [worktrezz] },
  { name: "Flutter and Dart", layer: "interface", projects: [ritema, herisaga] },
  { name: "Riverpod and go_router", layer: "interface", projects: [herisaga] },
  { name: "Lottie", layer: "interface", projects: [herisaga] },
  { name: "Angular", layer: "interface", projects: [] },
  { name: "JavaScript", layer: "interface", projects: [library, pyramidos, worktrezz, herisaga, whiteLies] },
  { name: "HTML, CSS and SCSS", layer: "interface", projects: [library] },
  { name: "HTMX and Jinja2", layer: "interface", projects: [authoring] },
  { name: "Streamlit", layer: "interface", projects: [garbage] },
  { name: "MkDocs Material", layer: "interface", projects: [whiteLies] },
  {
    name: "Git and GitHub",
    layer: "infrastructure",
    projects: [worktrezz, ritema, garbage, pyramidos, library, herisaga, authoring, whiteLies],
  },
  { name: "Docker", layer: "infrastructure", projects: [herisaga, authoring, ritema, worktrezz] },
  { name: "GitHub Actions", layer: "infrastructure", projects: [herisaga, whiteLies] },
  { name: "GitHub Pages", layer: "infrastructure", projects: [whiteLies] },
  { name: "Sentry and PostHog", layer: "infrastructure", projects: [herisaga] },
  { name: "pytest", layer: "infrastructure", projects: [whiteLies] },
  { name: "Maven", layer: "infrastructure", projects: [worktrezz, ritema] },
  { name: "Postman", layer: "infrastructure", projects: [worktrezz, ritema, herisaga, pyramidos] },
];
