import NextLink from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx, isExternalHref } from "./cx";

type ButtonVariant = "primary" | "secondary";

type BaseProps = {
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
  /** Trailing arrow glyph; slides on hover/focus. */
  arrow?: boolean;
};

type ButtonElementProps = BaseProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof BaseProps> & { href?: undefined };
type AnchorElementProps = BaseProps & Omit<ComponentPropsWithoutRef<"a">, keyof BaseProps> & { href: string };

export type ButtonProps = ButtonElementProps | AnchorElementProps;

/**
 * Square 48px action. Renders a <button>, or a link when `href` is given.
 * Primary = signal fill / ink label; secondary = hairline outline / bone label.
 * `data-magnetic` marks primaries for the magnetic pull hook (P0-03, pointer: fine only).
 */
export function Button({ variant = "primary", arrow = true, className, children, ...rest }: ButtonProps) {
  const shared = {
    className: cx("button", className),
    "data-variant": variant,
    "data-magnetic": variant === "primary" ? "" : undefined,
  };
  const inner = (
    <>
      <span className="button__label">{children}</span>
      {arrow && (
        <span className="button__arrow" aria-hidden="true">
          →
        </span>
      )}
    </>
  );

  if (rest.href !== undefined) {
    const { href, ...anchor } = rest as Omit<AnchorElementProps, keyof BaseProps>;
    if (isExternalHref(href)) {
      return (
        <a {...anchor} {...shared} href={href}>
          {inner}
        </a>
      );
    }
    return (
      <NextLink {...anchor} {...shared} href={href}>
        {inner}
      </NextLink>
    );
  }

  const { type = "button", ...button } = rest as Omit<ButtonElementProps, keyof BaseProps | "href">;
  return (
    <button {...button} {...shared} type={type}>
      {inner}
    </button>
  );
}
