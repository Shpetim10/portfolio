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

export const skills: Skill[] = [
  { name: "Java", layer: "services", projects: [worktrezz, ritema] },
  { name: "Spring Boot", layer: "api", projects: [worktrezz, ritema] },
  { name: "Spring Security and JWT", layer: "api", projects: [ritema, worktrezz] },
  { name: "Java EE", layer: "api", projects: [] },
  { name: "REST API design", layer: "api", projects: [worktrezz, ritema, library, herisaga, pyramidos] },
  { name: "Node.js", layer: "api", projects: [pyramidos] },
  { name: "PHP", layer: "api", projects: [library] },
  { name: "WebSockets", layer: "services", projects: [worktrezz] },
  { name: "Python", layer: "services", projects: [garbage, authoring] },
  { name: "TensorFlow", layer: "services", projects: [garbage] },
  { name: "Computer vision", layer: "services", projects: [garbage] },
  {
    name: "Machine learning: classification, clustering, regression",
    layer: "services",
    projects: [garbage],
  },
  { name: "Deep learning and neural networks", layer: "services", projects: [garbage] },
  { name: "C and C++", layer: "services", projects: [] },
  { name: "C#", layer: "services", projects: [] },
  { name: "PostgreSQL", layer: "data", projects: [worktrezz, herisaga, authoring] },
  { name: "MySQL", layer: "data", projects: [ritema, library] },
  { name: "Redis", layer: "data", projects: [ritema, herisaga] },
  { name: "Liquibase", layer: "data", projects: [worktrezz, ritema] },
  { name: "Hibernate and JPA", layer: "data", projects: [worktrezz, ritema] },
  { name: "Data analysis and data mining", layer: "data", projects: [garbage, authoring, pyramidos] },
  { name: "TypeScript", layer: "interface", projects: [worktrezz, herisaga, pyramidos] },
  { name: "React", layer: "interface", projects: [worktrezz, pyramidos] },
  { name: "Next.js", layer: "interface", projects: [worktrezz, pyramidos] },
  { name: "React Native", layer: "interface", projects: [worktrezz] },
  { name: "Flutter and Dart", layer: "interface", projects: [ritema, herisaga] },
  { name: "Angular", layer: "interface", projects: [] },
  { name: "JavaScript", layer: "interface", projects: [library, pyramidos, worktrezz, herisaga] },
  { name: "HTML, CSS and SCSS", layer: "interface", projects: [library] },
  {
    name: "Git and GitHub",
    layer: "infrastructure",
    projects: [worktrezz, ritema, garbage, pyramidos, library, herisaga, authoring],
  },
  { name: "Docker", layer: "infrastructure", projects: [herisaga, authoring, ritema, worktrezz] },
  { name: "Maven", layer: "infrastructure", projects: [worktrezz, ritema] },
  { name: "Postman", layer: "infrastructure", projects: [worktrezz, ritema, herisaga, pyramidos] },
];
