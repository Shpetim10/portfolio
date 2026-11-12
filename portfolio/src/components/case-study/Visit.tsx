import { Button } from "@/components/ui/Button";
import type { Link } from "@/content";

/*
 * <Visit /> · the closing call to action of a story whose product has its own
 * website (Project.site): the address large, and the action beside it. The same
 * link heads the case study (CaseHeader), so it is never more than a scroll away.
 */

export const hostOf = (site: Link) => new URL(site.href).host;

export function Visit({ site }: { site: Link }) {
  const host = hostOf(site);
  return (
    <aside className="visit story-wide" aria-label={`${site.label} on the web`}>
      <p className="visit__kicker">On the web</p>
      <p className="visit__host">{host}</p>
      <Button href={site.href} target="_blank" rel="noopener noreferrer" className="visit__action">
        Visit {host}
        <span className="sr-only"> (opens in a new tab)</span>
      </Button>
    </aside>
  );
}
