import { InstrumentDrawing } from "@/components/three/InstrumentDrawing";
import { Button } from "@/components/ui/Button";
import { Content } from "@/components/ui/Content";
import { Link } from "@/components/ui/Link";
import { SectionShell } from "@/components/ui/SectionShell";
import { getProfile, isTodo, type Profile } from "@/content";
import { isPublished } from "@/content/files";
import { todo } from "@/content/todo";
import { Reveal } from "@/motion/signatures/reveal";
import { ContactForm } from "./ContactForm";
import { ContactStage } from "./ContactStage";
import { CopyEmail } from "./CopyEmail";

/*
 * T13 · Contact. Static, readable markup first (server-rendered, complete with
 * JS off); ContactStage adds the reassembly and the LED hand-over, ContactForm
 * the validation and in-page states, CopyEmail the clipboard.
 *
 * Layout (src/styles/contact.css)
 *   desktop  the line in display-xl across the full width (may bleed); beneath,
 *            the station (Instrument over the primary button, the email line,
 *            socials, resume) in columns 1–5 and the form in 7–12.
 *   mobile   the line, then the station — the Instrument at a third of the
 *            width beside the primary button — then the form, then the links.
 *   static   (reduced motion, no JS) the Instrument shown assembled, its LED
 *            already in the button's dot.
 *
 * The form posts to a static form service (Formspree). Its endpoint is site
 * configuration, not a fact about the owner: FORM_ENDPOINT at build time.
 * Without it the form renders disabled and marked TODO; email stays the way in.
 */

export const HEADLINE = "Let’s build something precise.";

/** https://formspree.io/f/<id> — set at build. Anything else is ignored rather than posted to. */
const configuredEndpoint = () => {
  const value = process.env.FORM_ENDPOINT?.trim();
  return value && /^https:\/\//.test(value) ? value : null;
};

type ContactProps = {
  profile?: Pick<Profile, "email" | "socials" | "resumeUrl">;
  /** Form service endpoint; defaults to FORM_ENDPOINT. */
  endpoint?: string | null;
  /** Whether the resume PDF is published; defaults to checking /public. */
  resumeAvailable?: boolean;
  id?: string;
  index?: number;
};

export function Contact({
  profile = getProfile(),
  endpoint = configuredEndpoint(),
  resumeAvailable,
  id = "contact",
  index = 10,
}: ContactProps) {
  const email = isTodo(profile.email) ? null : profile.email;
  const mailto = email ? `mailto:${email}` : null;
  const resume = resumeAvailable ?? isPublished(profile.resumeUrl);

  return (
    <SectionShell id={id} index={index} title="Contact" contentClassName="contact-shell">
      <Reveal as="h2" id={`${id}-title`} className="contact__headline">
        {HEADLINE}
      </Reveal>

      <ContactStage>
        <div className="contact__figure" data-contact="figure" aria-hidden="true">
          <InstrumentDrawing pose="assembled" />
        </div>

        <div className="contact__cta">
          {mailto ? (
            <Button href={mailto} className="contact__primary" data-contact="primary">
              <Socket />
              Email me
            </Button>
          ) : (
            <Button aria-disabled="true" className="contact__primary" data-contact="primary">
              <Socket />
              Email me
            </Button>
          )}
          <span className="contact__traveller" data-contact="traveller" aria-hidden="true" />
        </div>
      </ContactStage>

      <div className="contact__channels">
        <section className="contact__group" aria-labelledby={`${id}-email`}>
          <h3 id={`${id}-email`} className="contact__label">
            Email
          </h3>
          {email ? (
            <div className="contact__email">
              <a className="link contact__address" href={mailto!}>
                {email}
              </a>
              <CopyEmail email={email} />
            </div>
          ) : (
            <Content as="p" value={profile.email} className="contact__address" />
          )}
        </section>

        <section className="contact__group" aria-labelledby={`${id}-elsewhere`}>
          <h3 id={`${id}-elsewhere`} className="contact__label">
            Elsewhere
          </h3>
          {profile.socials.length > 0 ? (
            <ul className="contact__links">
              {profile.socials.map((social) => (
                <li key={social.href}>
                  <Link href={social.href} target="_blank" className="contact__link">
                    {social.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Content as="p" value={todo("Social links")} />
          )}
        </section>

        <section className="contact__group" aria-labelledby={`${id}-resume`}>
          <h3 id={`${id}-resume`} className="contact__label">
            Resume
          </h3>
          <ul className="contact__links">
            <li>
              {resume ? (
                <Link href={profile.resumeUrl} download className="contact__link" data-contact="resume">
                  Download PDF
                  <span className="contact__link-glyph" aria-hidden="true">
                    ↓
                  </span>
                </Link>
              ) : (
                <Content value={todo(`Resume PDF at public${profile.resumeUrl}`)} />
              )}
            </li>
            <li>
              <Link href="/resume/" className="contact__link">
                Read it here
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <ContactForm endpoint={endpoint} email={email} formId={`${id}-form`} />
    </SectionShell>
  );
}

/** The button's indicator: empty until the Instrument's LED lands in it. */
function Socket() {
  return (
    <span className="contact__socket" aria-hidden="true">
      <span className="contact__socket-led" data-contact="socket" />
    </span>
  );
}
