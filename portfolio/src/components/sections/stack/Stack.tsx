import type { CSSProperties } from "react";
import { LAYER_NAMES, LAYERS, partNumber } from "@/components/chrome/nav";
import { InstrumentDrawing, STATIC_ANCHORS } from "@/components/three/InstrumentDrawing";
import { Content } from "@/components/ui/Content";
import { OpenProject } from "@/components/ui/OpenProject";
import { SectionShell } from "@/components/ui/SectionShell";
import { getProjects, getSkills, type Layer, type Project, type Skill } from "@/content";
import { todo } from "@/content/todo";
import { AssemblyLine, type AssemblyMark, type AssemblyTrack } from "./AssemblyLine";
import sprite from "./sprite.json";
import { StackStage } from "./StackStage";

/*
 * T08 · Stack as a bill of materials. Static, readable markup first
 * (server-rendered, every fact in the HTML); StackStage adds the lighting.
 *
 * Layout (src/styles/stack.css)
 *   all sizes: one native <details> accordion per layer, one open at a time.
 *   desktop (≥ 64rem): three-column part rows beside the sticky Instrument.
 *   mobile and tablet: project links below each technology; a sticky drawing bar.
 * Every part is rendered once, and the accordions work without JavaScript.
 *
 * Part number of a technology: its layer's P/N, then its place in the layer
 * ("02.03" = third part of the API layer). The drawing is decorative: the
 * list already says everything it shows.
 *
 * T08b puts the assembly line on top: the same parts on five moving tracks,
 * marked with their brand icons (monochrome, from one inline sprite built by
 * `pnpm stack:icons`) or monograms. It's a visual index into this list —
 * every row carries data-skill, and tapping a part on a track scrolls to it.
 */

type Group = { layer: Layer; number: string; parts: (Skill & { part: string })[] };

const pad = (n: number) => String(n).padStart(2, "0");

const groupByLayer = (skills: Skill[]): Group[] =>
  LAYERS.map((layer) => {
    const number = partNumber(layer).replace("P/N ", "");
    return {
      layer,
      number,
      parts: skills
        .filter((skill) => skill.layer === layer)
        .map((skill, i) => ({ ...skill, part: `${number}.${pad(i + 1)}` })),
    };
  });

/** A part's key across the assembly line and the bill of materials: "C#" → "c-sharp". */
const skillKey = (name: string) =>
  name
    .toLowerCase()
    .replaceAll("#", " sharp ")
    .replaceAll("+", " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Symbol markup by id, from the build-time sprite (sprite.json). */
const SYMBOLS = new Map(
  sprite.symbols
    .split("</symbol>")
    .filter(Boolean)
    .map((symbol) => [symbol.match(/id="([^"]+)"/)![1], `${symbol}</symbol>`]),
);

/** No mark given (the lab's specimens): a monogram of the name's initials. */
const initials = (name: string) => {
  const words = name.toUpperCase().match(/[A-Z0-9]+/g) ?? ["?"];
  const letters = words.length > 1 ? words.map((word) => word[0]).join("") : words[0];
  return letters.slice(0, words.length > 1 ? 4 : 2).padEnd(2, letters[0]);
};

function markOf(skill: Skill): AssemblyMark {
  const icon = skill.icon;
  if (!icon) return { monogram: initials(skill.name) };
  if (icon.source === "monogram") return { monogram: icon.text };
  const id = `${icon.source === "simple-icons" ? "si" : "di"}-${icon.slug}`;
  if (!SYMBOLS.has(id)) {
    throw new Error(
      `[stack] "${skill.name}" needs the ${icon.source} icon "${icon.slug}": run pnpm stack:icons`,
    );
  }
  return { sprite: id };
}

const toTracks = (groups: Group[]): AssemblyTrack[] =>
  groups.map((group) => ({
    layer: group.layer,
    part: `P/N ${group.number}`,
    name: LAYER_NAMES[group.layer],
    count: group.parts.length,
    parts: group.parts.map((part) => ({
      key: skillKey(part.name),
      name: part.name,
      mark: markOf(part),
      ai: !!part.ai,
    })),
  }));

const countLabel = (n: number) => `${pad(n)} ${n === 1 ? "part" : "parts"}`;

/** Every project a layer's parts are used in, for lighting the whole group. */
const usedIn = (group: Group) => [...new Set(group.parts.flatMap((part) => part.projects))].join(" ");

type StackProps = {
  skills?: Skill[];
  projects?: Project[];
  id?: string;
  index?: number;
};

export function Stack({
  skills = getSkills(),
  projects = getProjects(),
  id = "stack",
  index = 5,
}: StackProps) {
  const groups = groupByLayer(skills);
  const bySlug = new Map(projects.map((project) => [project.slug, project]));
  const total = countLabel(skills.length);
  const tracks = toTracks(groups);
  const keys = new Set(skills.map((skill) => skillKey(skill.name)));
  if (keys.size !== skills.length) throw new Error("[stack] two technologies share a name");
  const used = new Set(
    tracks.flatMap((track) => track.parts.flatMap(({ mark }) => ("sprite" in mark ? mark.sprite : []))),
  );
  const symbols = [...used].map((symbol) => SYMBOLS.get(symbol)).join("");

  return (
    <SectionShell id={id} index={index} title="Stack" contentClassName="stack-shell">
      {symbols && (
        // One inline sprite for every mark on the assembly line: no icon requests.
        <svg
          className="assembly-sprite"
          aria-hidden="true"
          focusable="false"
          dangerouslySetInnerHTML={{ __html: symbols }}
        />
      )}
      <StackStage>
        <AssemblyLine tracks={tracks} />
        <h2 className="stack__label">
          Bill of materials{skills.length > 0 && <span className="stack__total"> · {total}</span>}
        </h2>

        <Figure projects={projects} total={total} />

        <div className="stack__sheets" data-stack="sheets">
          {groups.map((group) => (
            <details
              key={group.layer}
              name={`${id}-layer`}
              className="bom-sheet"
              data-stack="group"
              data-layer={group.layer}
              data-projects={usedIn(group)}
              data-part={`P/N ${group.number}`}
              data-name={LAYER_NAMES[group.layer]}
            >
              <summary className="bom-sheet__head" data-stack="row">
                <span className="bom__group-number">P/N {group.number}</span>
                <span className="bom__group-name">{LAYER_NAMES[group.layer]}</span>
                <span className="bom__group-count">{countLabel(group.parts.length)}</span>
                <span className="bom-sheet__toggle" aria-hidden="true" />
              </summary>
              <div className="bom-sheet__body">
                {group.parts.length > 0 ? (
                  <ul className="bom-sheet__parts">
                    {group.parts.map((part) => (
                      <li
                        key={part.part}
                        className="bom-sheet__part"
                        data-stack="row"
                        data-layer={group.layer}
                        data-projects={part.projects.join(" ")}
                        data-part={part.part}
                        data-name={part.name}
                        data-skill={skillKey(part.name)}
                      >
                        <span className="bom__part">{part.part}</span>
                        <Content value={part.name} className="bom__tech" />
                        <span className="bom-sheet__where">
                          <span className="sr-only">Used in: </span>
                          <WhereUsed slugs={part.projects} bySlug={bySlug} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Content
                    as="p"
                    value={todo(`${LAYER_NAMES[group.layer]} technologies`)}
                    className="bom-sheet__todo"
                  />
                )}
              </div>
            </details>
          ))}
        </div>
      </StackStage>
    </SectionShell>
  );
}

function WhereUsed({ slugs, bySlug }: { slugs: string[]; bySlug: Map<string, Project> }) {
  const used = slugs.flatMap((slug) => bySlug.get(slug) ?? []);
  if (used.length === 0) {
    return (
      <span className="bom__none">
        <span aria-hidden="true">—</span>
        <span className="sr-only">No listed project</span>
      </span>
    );
  }
  return (
    <ul className="bom__projects">
      {used.map((project) => (
        <li key={project.slug}>
          <OpenProject
            href={`/work/${project.slug}/`}
            label={project.partNumber}
            className="link bom__project"
          >
            <span className="bom__project-number">{project.partNumber}</span>{" "}
            <Content value={project.title} />
          </OpenProject>
        </li>
      ))}
    </ul>
  );
}

/** The sticky drawing: plates lit by the row in hand, its readout, and the project index. */
function Figure({ projects, total }: { projects: Project[]; total: string }) {
  return (
    <div className="stack__figure" data-stack="figure" aria-hidden="true">
      <div className="stack__drawing">
        <InstrumentDrawing lit />
        <ol className="stack__plates">
          {LAYERS.map((layer, i) => (
            <li
              key={layer}
              className="stack__plate-number"
              data-layer={layer}
              style={{ "--note-x": STATIC_ANCHORS[i].x, "--note-y": STATIC_ANCHORS[i].y } as CSSProperties}
            >
              {partNumber(layer).replace("P/N ", "")}
            </li>
          ))}
        </ol>
      </div>
      <div className="stack__readout">
        <p className="stack__reading part-label">
          <span className="part-label__number" data-stack="readout-part">
            {pad(LAYERS.length)} layers
          </span>{" "}
          — <span data-stack="readout-name">{total}</span>
        </p>
        <ol className="stack__index">
          {projects.map((project) => (
            <li key={project.slug} className="stack__index-item" data-slug={project.slug}>
              {project.partNumber}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
