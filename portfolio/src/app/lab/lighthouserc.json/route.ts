import config from "../../../../lighthouserc.json";

// Serves the repository's Lighthouse CI config as the proof for /lab's quality gates,
// so the link doesn't depend on the Git repository being public. Prerendered at build.
export const dynamic = "force-static";

export function GET() {
  return Response.json(config);
}
