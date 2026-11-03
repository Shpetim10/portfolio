/**
 * Whether the resume is public. Withheld for now (owner, 2026-11-03): no
 * /resume page, no PDF served, and no link to either anywhere on the site.
 *
 * To publish it again:
 *   1. set this to true;
 *   2. rename src/app/_resume back to src/app/resume (the underscore keeps it out of routing);
 *   3. move assets-src/resume.pdf back to public/resume.pdf (profile.resumeUrl).
 */
export const RESUME_PUBLIC = false;
