import { ContentError } from "@/content";

/*
 * System diagram geometry (T07 · Architecture chapter). Pure: the server lays
 * the drawing out once per orientation; nothing is measured in the browser.
 *
 * Authoring: nodes sit on a grid of columns (the flow, left → right) and rows.
 * At most 5 columns and 3 rows — on phones the grid is transposed (columns run
 * top → bottom, rows become ≤ 3 columns), so every diagram has a designed
 * mobile drawing instead of a shrunk one.
 *
 * Connections are leader lines (design-system.md · Annotation system): leave
 * the source along the flow, cross lanes in the gutter just before the target
 * (45° chamfers at both turns), enter the target's near side; signal dot on
 * the target. Lines only cross lanes in gutters, never through a box. A link
 * that skips columns runs along its source lane, so keep that lane clear
 * between them (the author's call). Each straight piece is one segment, so
 * the drawing animates with transforms only (DiagramStage).
 */

export type DiagramNode = {
  id: string;
  label: string;
  /** Part label above the name, e.g. "N01". */
  part?: string;
  /** 0-based position along the flow. */
  col: number;
  /** 0-based lane. */
  row: number;
};

export type DiagramLink = { from: string; to: string; label?: string };

export type Orientation = "wide" | "tall";
export const ORIENTATIONS: Orientation[] = ["wide", "tall"];

export const MAX_COLS = 5;
export const MAX_ROWS = 3;

type Point = { x: number; y: number };
export type Segment = { x1: number; y1: number; x2: number; y2: number; length: number };

export type PlacedNode = DiagramNode & { x: number; y: number; w: number; h: number; at: number };
/** `labelAt` is unset when no run is long enough to carry the label (it stays in the netlist). */
export type PlacedLink = DiagramLink & { segments: Segment[]; end: Point; labelAt?: Point; at: number };
export type DiagramLayout = { width: number; height: number; nodes: PlacedNode[]; links: PlacedLink[] };

/*
 * Drawing units. "p" runs along the flow (x when wide, y when tall), "s" across it.
 * Boxes are inset in their cells, leaving the gaps the 45° legs route through.
 * Tall cells are narrower across (≤ 3 lanes fit a phone) and boxes taller (names wrap).
 */
const GRID: Record<Orientation, { cellP: number; cellS: number; boxP: number; boxS: number }> = {
  wide: { cellP: 200, cellS: 128, boxP: 152, boxS: 64 },
  tall: { cellP: 152, cellS: 172, boxP: 80, boxS: 148 },
};

/** Timeline positions (arbitrary units; DiagramStage scrubs them over scroll). */
const NODE_STEP = 1;
const LANE_STEP = 0.2;
const LINK_DELAY = 0.5;

/** Shortest run that carries a link label without it covering the boxes either side. */
const LABEL_RUN = 40;

export function validateDiagram(nodes: DiagramNode[], links: DiagramLink[]): void {
  const ids = new Set<string>();
  const cells = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.id)) throw new ContentError(`Diagram node "${node.id}" is defined twice.`);
    ids.add(node.id);
    const { col, row } = node;
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || row < 0) {
      throw new ContentError(`Diagram node "${node.id}" needs a whole-number col and row from 0.`);
    }
    if (col >= MAX_COLS || row >= MAX_ROWS) {
      throw new ContentError(
        `Diagram node "${node.id}" is outside the ${MAX_COLS} × ${MAX_ROWS} grid (col ${col}, row ${row}).`,
      );
    }
    const cell = `${col}:${row}`;
    if (cells.has(cell))
      throw new ContentError(`Diagram node "${node.id}" shares cell ${cell} with another.`);
    cells.add(cell);
  }
  for (const { from, to } of links) {
    if (!ids.has(from) || !ids.has(to)) {
      throw new ContentError(`Diagram link ${from} → ${to} names a node that doesn't exist.`);
    }
    if (from === to) throw new ContentError(`Diagram link ${from} → ${to} connects a node to itself.`);
  }
}

const segment = (a: Point, b: Point): Segment => ({
  x1: a.x,
  y1: a.y,
  x2: b.x,
  y2: b.y,
  length: Math.hypot(b.x - a.x, b.y - a.y),
});

/**
 * Lays the diagram out in one orientation. Call validateDiagram first.
 * Node and link `at` order the drawing: column by column, each link once both its ends exist.
 */
export function layoutDiagram(
  nodes: DiagramNode[],
  links: DiagramLink[],
  orientation: Orientation,
): DiagramLayout {
  const { cellP, cellS, boxP, boxS } = GRID[orientation];
  const cols = Math.max(...nodes.map((node) => node.col)) + 1;
  const rows = Math.max(...nodes.map((node) => node.row)) + 1;
  // (p, s) → (x, y)
  const toXY = (p: number, s: number): Point => (orientation === "wide" ? { x: p, y: s } : { x: s, y: p });

  const placed = nodes.map((node): PlacedNode => {
    const centre = toXY((node.col + 0.5) * cellP, (node.row + 0.5) * cellS);
    const size = toXY(boxP, boxS);
    return { ...node, ...centre, w: size.x, h: size.y, at: node.col * NODE_STEP + node.row * LANE_STEP };
  });
  const byId = new Map(placed.map((node) => [node.id, node]));
  const pOf = (node: PlacedNode) => (orientation === "wide" ? node.x : node.y);
  const sOf = (node: PlacedNode) => (orientation === "wide" ? node.y : node.x);

  const routed = links.map((link): PlacedLink => {
    const source = byId.get(link.from)!;
    const target = byId.get(link.to)!;
    const [sp, ss, tp, ts] = [pOf(source), sOf(source), pOf(target), sOf(target)];
    const dirP = Math.sign(tp - sp);
    const dirS = Math.sign(ts - ss);

    // In (p, s): along the flow, then the 45° leg, then across into the target's facing edge.
    let path: [number, number][];
    if (dirS === 0) {
      path = [
        [sp + (dirP * boxP) / 2, ss],
        [tp - (dirP * boxP) / 2, ts],
      ];
    } else if (dirP === 0) {
      path = [
        [sp, ss + (dirS * boxS) / 2],
        [tp, ts - (dirS * boxS) / 2],
      ];
    } else {
      // Along the source's lane to the gutter before the target, down the gutter
      // with a 45° chamfer at each turn, into the target's near side.
      const chamfer = (cellP - boxP) / 2;
      const channel = tp - dirP * (boxP / 2 + chamfer);
      path = [
        [sp + (dirP * boxP) / 2, ss],
        [channel - dirP * chamfer, ss],
        [channel, ss + dirS * chamfer],
        [channel, ts - dirS * chamfer],
        [tp - (dirP * boxP) / 2, ts],
      ];
    }

    const points = path.map(([p, s]) => toXY(p, s));
    const segments = points
      .slice(1)
      .map((point, i) => segment(points[i], point))
      .filter((piece) => piece.length > 0.5);
    // Label on the longest piece, at its middle, if it has room.
    const longest = segments.reduce((a, b) => (b.length > a.length ? b : a));
    return {
      ...link,
      segments,
      end: points[points.length - 1],
      labelAt:
        longest.length >= LABEL_RUN
          ? { x: (longest.x1 + longest.x2) / 2, y: (longest.y1 + longest.y2) / 2 }
          : undefined,
      at: Math.max(source.at, target.at) + LINK_DELAY,
    };
  });

  const size = toXY(cols * cellP, rows * cellS);
  return { width: size.x, height: size.y, nodes: placed, links: routed };
}
