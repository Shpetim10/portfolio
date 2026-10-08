import type { CSSProperties } from "react";
import { Content } from "@/components/ui/Content";
import { todo } from "@/content/todo";
import { DiagramStage } from "./DiagramStage";
import {
  layoutDiagram,
  ORIENTATIONS,
  validateDiagram,
  type DiagramLayout,
  type DiagramLink,
  type DiagramNode,
  type Orientation,
} from "./diagram";

/*
 * An SVG system diagram that draws itself on scroll (T07 · Architecture).
 * Nodes are hairline boxes, connections leader lines, part labels mono.
 *
 *   wide  ≥ 48rem   the grid as authored: flow runs left → right
 *   tall  < 48rem   transposed: flow runs top → bottom, lanes side by side
 * Both drawings are in the HTML; CSS shows one, DiagramStage animates the shown one.
 *
 * Lines and boxes are SVG (1px at every size: non-scaling strokes); labels are
 * HTML laid over them, so type stays at the design-system sizes while the
 * drawing scales. The drawing is aria-hidden: its text alternative is the
 * netlist after the caption (every part, every connection), read in order.
 * Without nodes (still TODO) the figure is a marked placeholder frame.
 */

type SystemDiagramProps = {
  nodes?: DiagramNode[];
  links?: DiagramLink[];
  caption: string;
};

const pct = (value: number, of: number) => (value / of) * 100;

export function SystemDiagram({ nodes = [], links = [], caption }: SystemDiagramProps) {
  if (nodes.length === 0) {
    return (
      <figure className="diagram story-wide case-figure" data-todo="">
        <div className="diagram__empty">
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M0 0L1 1M1 0L0 1" vectorEffect="non-scaling-stroke" />
          </svg>
          <Content value={todo("System diagram · nodes on a grid + their connections")} />
        </div>
        <Caption caption={caption} />
      </figure>
    );
  }

  validateDiagram(nodes, links);
  const names = new Map(nodes.map((node) => [node.id, node.label]));

  return (
    <figure className="diagram story-wide case-figure">
      <DiagramStage>
        {ORIENTATIONS.map((orientation) => (
          <Drawing
            key={orientation}
            layout={layoutDiagram(nodes, links, orientation)}
            orientation={orientation}
          />
        ))}
      </DiagramStage>
      <Caption caption={caption} />
      <div className="sr-only">
        <p>
          {nodes.length} parts, {links.length} connections.
        </p>
        <ul aria-label="Parts">
          {nodes.map((node) => (
            <li key={node.id}>
              {node.part && `${node.part} — `}
              {node.label}
            </li>
          ))}
        </ul>
        {links.length > 0 && (
          <ul aria-label="Connections">
            {links.map((link) => (
              <li key={`${link.from}-${link.to}`}>
                {names.get(link.from)} to {names.get(link.to)}
                {link.label && `, ${link.label}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </figure>
  );
}

function Caption({ caption }: { caption: string }) {
  return (
    <figcaption className="case-figure__caption">
      <span className="case-figure__number" aria-hidden="true" />
      <Content value={caption} />
    </figcaption>
  );
}

function Drawing({ layout, orientation }: { layout: DiagramLayout; orientation: Orientation }) {
  const { width, height, nodes, links } = layout;
  const ratio = { "--diagram-ratio": `${width} / ${height}` } as CSSProperties;
  const box = (x: number, y: number, w = 0, h = 0) =>
    ({
      "--x": pct(x - w / 2, width),
      "--y": pct(y - h / 2, height),
      "--w": pct(w, width),
      "--h": pct(h, height),
    }) as CSSProperties;

  return (
    <div className="diagram__drawing" data-orientation={orientation} style={ratio} aria-hidden="true">
      <svg className="diagram__svg" viewBox={`0 0 ${width} ${height}`} focusable="false">
        {links.map((link) => (
          <g key={`${link.from}-${link.to}`} data-diagram="link" data-at={link.at}>
            {link.segments.map(({ x1, y1, x2, y2, length }, i) => (
              <line
                key={i}
                className="diagram__line"
                data-diagram="segment"
                data-length={length}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {/* A zero-length round-capped stroke: a dot that stays 4px at any scale. */}
            <path
              className="diagram__dot"
              data-diagram="dot"
              d={`M${link.end.x} ${link.end.y}h0.01`}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        {nodes.map((node) => (
          <rect
            key={node.id}
            className="diagram__box"
            data-diagram="box"
            data-node={node.id}
            data-at={node.at}
            x={node.x - node.w / 2}
            y={node.y - node.h / 2}
            width={node.w}
            height={node.h}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <ul className="diagram__labels">
        {nodes.map((node) => (
          <li
            key={node.id}
            className="diagram__node"
            data-diagram="label"
            data-node={node.id}
            style={box(node.x, node.y, node.w, node.h)}
          >
            {node.part && <span className="diagram__part">{node.part}</span>}
            <Content value={node.label} className="diagram__name" />
          </li>
        ))}
        {links.map(
          (link) =>
            link.label &&
            link.labelAt && (
              <li
                key={`${link.from}-${link.to}`}
                className="diagram__link-label"
                data-diagram="link-label"
                data-at={link.at}
                style={box(link.labelAt.x, link.labelAt.y)}
              >
                {link.label}
              </li>
            ),
        )}
      </ul>
    </div>
  );
}
