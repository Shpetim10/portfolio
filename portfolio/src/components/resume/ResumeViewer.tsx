import { Logo } from "@/components/brand/Logo";
import { Content } from "@/components/ui/Content";
import { Link } from "@/components/ui/Link";
import { todo } from "@/content/todo";

/*
 * The resume is the owner's real PDF (profile.resumeUrl in /public), shown as
 * it was written: not rebuilt from content. Static markup, no motion.
 *
 * Layout (src/styles/resume.css)
 *   screen   a bar (lockup, label, open, download) over the browser's own PDF viewer,
 *            framed on carbon, page-width and as tall as the viewport allows.
 *   < 48rem  phones can't scroll an embedded PDF, so the viewer gives way to a
 *            card that opens or downloads the file.
 *   no PDF   until the file is in /public a TODO stands in (never a dead link).
 */

type ResumeViewerProps = {
  /** The static PDF (profile.resumeUrl) and whether it's in /public yet. */
  pdf: { href: string; published: boolean };
  /** Name for the viewer's accessible title: "<name> — resume (PDF)". */
  title: string;
};

/** Viewer hints for the browser's PDF reader: fit the page width, drop the side panels. */
const VIEWER_PARAMS = "#view=FitH&navpanes=0";

export function ResumeViewer({ pdf, title }: ResumeViewerProps) {
  const label = `${title} — resume (PDF)`;

  return (
    <div className="resume layout-grid">
      <div className="resume__bar">
        <div className="resume__bar-title">
          <Logo variant="lockup" size="var(--logo-resume)" />
          <p className="resume__bar-label">
            Resume <span aria-hidden="true">·</span> PDF
          </p>
        </div>
        {pdf.published && (
          <div className="resume__bar-actions">
            <Link href={pdf.href} target="_blank" className="resume__action" data-resume="open">
              Open in new tab
            </Link>
            <Link href={pdf.href} download className="resume__action" data-resume="pdf">
              Download PDF
              <span aria-hidden="true"> ↓</span>
            </Link>
          </div>
        )}
      </div>

      {pdf.published ? (
        <div className="resume__frame" data-surface="paper">
          <object
            className="resume__viewer"
            data={`${pdf.href}${VIEWER_PARAMS}`}
            type="application/pdf"
            aria-label={label}
          >
            <p className="resume__fallback-note">
              This browser can&rsquo;t display the PDF here.{" "}
              <Link href={pdf.href} target="_blank" className="resume__action">
                Open the PDF
              </Link>
            </p>
          </object>
          <div className="resume__card">
            <p className="resume__card-title">{label}</p>
            <p className="resume__card-note">Opens in your device&rsquo;s PDF reader.</p>
            <Link href={pdf.href} target="_blank" className="resume__action">
              Open the PDF
            </Link>
          </div>
        </div>
      ) : (
        <div className="resume__frame resume__frame--empty">
          <Content as="p" value={todo(`Resume PDF at public${pdf.href}`)} />
        </div>
      )}
    </div>
  );
}
