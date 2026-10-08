import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MDXContent } from "mdx/types";
import { CHAPTERS } from "./chapters";
import { ContentError } from "./index";

/*
 * Case-study stories: one MDX module per project at src/content/work/<slug>.mdx.
 * Server only (build time). Before a story is rendered its source is checked
 * against the template, so a malformed story fails `next build`, not the page:
 *   - exactly the six chapters, in order (src/content/chapters.ts)
 *   - the Architecture chapter carries the <SystemDiagram>
 *   - exactly one <Spread> (the paper-inverted strongest visual)
 *   - no markdown h1 / h2: the page owns h1, chapters own h2 (use ### inside)
 */

const STORY_DIR = join(process.cwd(), "src/content/work");
const CHAPTER_TAG = /<Chapter\s+id="([^"]+)"/g;
const TOP_HEADING = /^#{1,2}\s/m;
const COMMENT = /\{\/\*[\s\S]*?\*\/\}/g;
const count = (source: string, tag: string) => source.split(`<${tag}`).length - 1;

async function checkStory(slug: string): Promise<void> {
  const file = join(STORY_DIR, `${slug}.mdx`);
  const raw = await readFile(file, "utf8").catch(() => {
    throw new ContentError(`Project "${slug}" has no story. Add src/content/work/${slug}.mdx.`);
  });
  // Checks read the story as rendered: {/* comments */} (like the template notes) don't count.
  const source = raw.replace(COMMENT, "");

  const found = [...source.matchAll(CHAPTER_TAG)].map((match) => match[1]);
  const expected = CHAPTERS.map((chapter) => chapter.id);
  if (found.join() !== expected.join()) {
    throw new ContentError(
      `Story "${slug}" must have the chapters ${expected.join(" · ")} in order (found ${found.join(" · ") || "none"}).`,
    );
  }
  const architecture = source.split(/<Chapter\s+id="architecture"/)[1].split(/<Chapter\s/)[0];
  if (count(architecture, "SystemDiagram") !== 1) {
    throw new ContentError(`Story "${slug}": the Architecture chapter needs exactly one <SystemDiagram>.`);
  }
  if (count(source, "Spread") !== 1) {
    throw new ContentError(`Story "${slug}" needs exactly one <Spread> (found ${count(source, "Spread")}).`);
  }
  if (TOP_HEADING.test(source)) {
    throw new ContentError(`Story "${slug}" uses a # or ## heading. Chapters own those levels; use ###.`);
  }
}

/** The project's story as a component, after checking it against the template. */
export async function loadStory(slug: string): Promise<MDXContent> {
  await checkStory(slug);
  const story: { default: MDXContent } = await import(`./work/${slug}.mdx`);
  return story.default;
}
