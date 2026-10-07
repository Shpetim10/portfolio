/** Joins truthy class names. */
export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(" ");

/** Absolute URLs, protocol-relative URLs and schemes (mailto:, tel:) leave the site. */
export const isExternalHref = (href: string): boolean => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href);
