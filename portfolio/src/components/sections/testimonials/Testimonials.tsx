import { SectionShell } from "@/components/ui/SectionShell";
import { checkTestimonials, getTestimonials, type Testimonial } from "@/content";
import { PeerReview } from "./PeerReview";

/*
 * T12 · Testimonials — "PEER REVIEW".
 *
 * One quote at a time at heading size, its attribution in mono beneath
 * (name · title · company · relation). Only quotes from /src/content/testimonials.ts
 * ever render; with none, the whole section — index line and registration
 * marks included — is left out, so there is no placeholder to mistake for a
 * review. Static, readable markup first (server-rendered); PeerReview adds the
 * stepping, the 8s autoplay and the scroll-in.
 *
 * Mobile: the quote runs the column, the controls wrap under it (each 48px),
 * pause/play drops to its own line. Reduced motion: no autoplay, no pause
 * control, quotes swap with a 200ms fade. No JS: every quote is listed in turn.
 */

type TestimonialsProps = {
  testimonials?: Testimonial[];
  id?: string;
  index?: number;
};

export function Testimonials({
  testimonials = getTestimonials(),
  id = "peer-review",
  index = 9,
}: TestimonialsProps) {
  // The homepage list is validated at build (src/content); a list passed in here gets the same rules.
  checkTestimonials(testimonials);
  if (testimonials.length === 0) return null;

  return (
    <SectionShell id={id} index={index} title="Testimonials">
      <PeerReview items={testimonials} />
    </SectionShell>
  );
}
